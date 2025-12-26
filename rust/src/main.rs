use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
    Json, Router,
};
use llama_cpp_2::{
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::params::LlamaModelParams,
    model::{AddBos, LlamaModel, Special},
    sampling::LlamaSampler,
};
use serde::{Deserialize, Serialize};
use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::Arc;

// --- 1. Robust Error Handling ---
// This allows us to return errors to the client without crashing the server.
struct AppError(anyhow::Error);

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Internal Server Error: {}", self.0),
        )
            .into_response()
    }
}

impl<E> From<E> for AppError
where
    E: Into<anyhow::Error>,
{
    fn from(err: E) -> Self {
        Self(err.into())
    }
}

#[derive(Deserialize)]
struct PredictRequest {
    prompt: String,
    max_tokens: u32,
    stop: Vec<String>,
    #[serde(default = "default_temp")]
    temperature: f32,
}

fn default_temp() -> f32 {
    0.7 // 0.7 is a better default for chat than 0.2
}

#[derive(Serialize)]
struct PredictResponse {
    text: String,
}

struct AppState {
    model: LlamaModel,
    backend: LlamaBackend,
}

// --- 2. The Fallback Strategy ---
fn load_model_strategy(
    backend: &LlamaBackend,
    path: &PathBuf,
    gpu_layers: u32,
) -> anyhow::Result<LlamaModel> {
    let params = LlamaModelParams::default().with_n_gpu_layers(gpu_layers);
    LlamaModel::load_from_file(backend, path, &params)
        .map_err(|e| anyhow::anyhow!("Failed to load model: {}", e))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    // Initialize backend
    let backend = LlamaBackend::init()?;
    let model_path = PathBuf::from("models/mistral-7b-instruct-v0.2.Q4_K_S.gguf");

    println!("🚀 Attempting to load model...");

    // Try GPU first (offload all layers)
    let model = match load_model_strategy(&backend, &model_path, 99) {
        Ok(m) => {
            println!("✅ GPU Acceleration Active (Layers: 99)");
            m
        }
        Err(e) => {
            println!("⚠️ GPU Load Failed: {}. Falling back to CPU...", e);
            // Fallback to CPU (0 layers)
            load_model_strategy(&backend, &model_path, 0)
                .map_err(|e| anyhow::anyhow!("CRITICAL: Both GPU and CPU load failed: {}", e))?
        }
    };

    let state = Arc::new(AppState { model, backend });

    let app = Router::new()
        .route("/predict", post(handle_predict))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:5005").await?;
    println!("📡 API ready at http://127.0.0.1:5005/predict");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn handle_predict(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PredictRequest>,
) -> Result<Json<PredictResponse>, AppError> {
    
    // Create Context
    let n_ctx = 4096;
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(NonZeroU32::new(n_ctx))
        .with_offload_kqv(true); // Crucial for speed

    let mut ctx = state
        .model
        .new_context(&state.backend, ctx_params)
        .map_err(|e| anyhow::anyhow!("Context creation failed: {}", e))?;

    // Tokenize
    // Note: If your Python client does NOT add '<s>', change this to AddBos::Always
    let tokens = state
        .model
        .str_to_token(&payload.prompt, AddBos::Never)
        .map_err(|e| anyhow::anyhow!("Tokenization failed: {}", e))?;

    // Check if prompt exceeds context window
    if tokens.len() as u32 > n_ctx - payload.max_tokens {
         return Err(anyhow::anyhow!("Prompt is too long for context window").into());
    }

    // Initial Batch Decode
    let mut batch = LlamaBatch::new(n_ctx as usize, 1);
    for (i, token) in tokens.iter().enumerate() {
        batch.add(*token, i as i32, &[0.into()], i == tokens.len() - 1)?;
    }
    ctx.decode(&mut batch)
        .map_err(|e| anyhow::anyhow!("Initial decode failed: {}", e))?;

    // Sampler Setup
    let mut sampler = LlamaSampler::chain(
        vec![
            LlamaSampler::temp(payload.temperature),
            LlamaSampler::top_p(0.95, 1), // Top-P improves quality significantly
            LlamaSampler::dist(rand::random()), // Random seed
        ],
        false,
    );

    let mut generated_text = String::new();
    let mut n_cur = tokens.len() as i32;

    // Generation Loop
    for _ in 0..payload.max_tokens {
        let token = sampler.sample(&ctx, batch.n_tokens() - 1);

        if token == state.model.token_eos() {
            break;
        }

        let piece = state
            .model
            .token_to_str_with_size(token, 32, Special::Tokenize)
            .unwrap_or_default();
        
        generated_text.push_str(&piece);

        // Check stop sequences
        if payload.stop.iter().any(|s| generated_text.contains(s)) {
            break;
        }

        batch.clear();
        batch.add(token, n_cur, &[0.into()], true)?;
        
        ctx.decode(&mut batch)
            .map_err(|e| anyhow::anyhow!("Generation decode failed: {}", e))?;

        n_cur += 1;
        if n_cur >= n_ctx as i32 {
            break;
        }
    }

    Ok(Json(PredictResponse {
        text: generated_text,
    }))
}