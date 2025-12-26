use axum::{extract::State, routing::post, Json, Router};
use llama_cpp_2::{
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::params::LlamaModelParams,
    model::{AddBos, LlamaModel, Special},
};
use serde::{Deserialize, Serialize};
use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Deserialize)]
struct PredictRequest {
    prompt: String,
    max_tokens: u32,
    stop: Vec<String>,
}

#[derive(Serialize)]
struct PredictResponse {
    text: String,
}

struct AppState {
    model: LlamaModel,
}

#[derive(Debug)]
enum GpuBackend {
    Cuda,
    Cpu,
}

impl GpuBackend {
    fn name(&self) -> &str {
        match self {
            Self::Cuda => "CUDA (NVIDIA)",
            Self::Cpu => "CPU",
        }
    }
}

fn try_load_model(
    backend: &LlamaBackend,
    model_path: &PathBuf,
    gpu_layers: u32,
    gpu_backend: &GpuBackend,
) -> Result<LlamaModel, Box<dyn std::error::Error>> {
    println!("🔍 Trying {} with {} GPU layers...", gpu_backend.name(), gpu_layers);
    
    let params = LlamaModelParams::default().with_n_gpu_layers(gpu_layers);
    
    match LlamaModel::load_from_file(backend, model_path, &params) {
        Ok(model) => {
            println!("✅ Successfully loaded with {}", gpu_backend.name());
            Ok(model)
        }
        Err(e) => {
            println!("❌ {} failed: {}", gpu_backend.name(), e);
            Err(Box::new(e))
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("🚀 Initializing AI Sidecar with intelligent GPU detection...\n");
    
    let backend = LlamaBackend::init()?;
    let model_path = PathBuf::from("models/mistral-7b-instruct-v0.2.Q4_K_S.gguf");
    
    // Check which GPU backends are compiled
    let has_cuda = cfg!(feature = "cuda");
    
    println!("📦 Compiled features:");
    println!("   CUDA: {}", if has_cuda { "✅" } else { "❌" });
    println!();
    
    // Try loading with different backends in order of preference
    let mut fallback_chain: Vec<(GpuBackend, u32)> = Vec::new();
    
    // Strategy: Try CUDA with full offload first, then partial, then CPU
    if has_cuda {
        fallback_chain.push((GpuBackend::Cuda, 999)); 
        fallback_chain.push((GpuBackend::Cuda, 35));  
        fallback_chain.push((GpuBackend::Cuda, 24));
    }
    
    // Always have CPU as final fallback
    fallback_chain.push((GpuBackend::Cpu, 0));
    
    let mut model = None;
    let mut used_backend = None;
    
    for (backend_type, layers) in fallback_chain {
        match try_load_model(&backend, &model_path, layers, &backend_type) {
            Ok(loaded_model) => {
                model = Some(loaded_model);
                used_backend = Some((backend_type, layers));
                break;
            }
            Err(_) => continue,
        }
    }
    
    let model = model.ok_or_else(|| anyhow::anyhow!("Failed to load model with any backend!"))?;
    let (backend_type, layers) = used_backend.unwrap();
    
    println!("\n🎯 Final Configuration:");
    println!("   Backend: {}", backend_type.name());
    println!("   GPU Layers: {}", layers);
    println!("   Performance: {}", if layers > 0 { "🚀 ACCELERATED" } else { "🐢 CPU-ONLY" });
    println!();
    
    let state = Arc::new(AppState { model });

    let app = Router::new()
        .route("/predict", post(handle_predict))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:5005").await?;
    println!("📡 Sidecar online at http://127.0.0.1:5005");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn handle_predict(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PredictRequest>,
) -> Json<PredictResponse> {
    let n_ctx = 4096;
    let ctx_params = LlamaContextParams::default().with_n_ctx(NonZeroU32::new(n_ctx));
    
    // Create a new backend for this request (backends are lightweight)
    let backend = LlamaBackend::init().expect("Backend init error");
    let mut ctx = state.model.new_context(&backend, ctx_params).expect("Ctx error");

    let tokens = state.model.str_to_token(&payload.prompt, AddBos::Always).expect("Token error");
    let mut batch = LlamaBatch::new(n_ctx as usize, 1);

    for (i, token) in tokens.iter().enumerate() {
        let _ = batch.add(*token, i as i32, &[0.into()], i == tokens.len() - 1);
    }
    ctx.decode(&mut batch).expect("Decode error");

    let mut generated_text = String::new();
    let mut n_cur = tokens.len() as i32;

    for _ in 0..payload.max_tokens {
        let token = ctx.candidates_ith(batch.n_tokens() - 1)
            .max_by(|a, b| a.logit().partial_cmp(&b.logit()).unwrap())
            .map(|data| data.id())
            .expect("Sampling error");

        if token == state.model.token_eos() { break; }

        let piece = state.model.token_to_str_with_size(token, 32, Special::Tokenize).unwrap_or_default();
        generated_text.push_str(&piece);

        if payload.stop.iter().any(|s| generated_text.contains(s)) { break; }

        batch.clear();
        let _ = batch.add(token, n_cur, &[0.into()], true);
        ctx.decode(&mut batch).expect("Loop decode error");

        n_cur += 1;
        if n_cur >= n_ctx as i32 { break; }
    }

    Json(PredictResponse { text: generated_text })
}