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
    backend: LlamaBackend,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let backend = LlamaBackend::init()?;
    
    // Performance logic: Use CUDA if the feature is enabled
    let is_cuda_enabled = cfg!(feature = "cuda");
    let model_params = LlamaModelParams::default()
        .with_n_gpu_layers(if is_cuda_enabled { 999 } else { 0 });

    let model_path = PathBuf::from("models/mistral-7b-instruct-v0.2.Q4_K_S.gguf");
    
    println!("Hardware check: CUDA is {}", if is_cuda_enabled { "ENABLED 🚀" } else { "DISABLED 🐢" });

    let model = LlamaModel::load_from_file(&backend, &model_path, &model_params)
        .map_err(|e| anyhow::anyhow!("Model Load Fail: {}", e))?;

    let state = Arc::new(AppState { model, backend });

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
    let n_ctx = 2048;
    let ctx_params = LlamaContextParams::default().with_n_ctx(NonZeroU32::new(n_ctx));
    let mut ctx = state.model.new_context(&state.backend, ctx_params).expect("Ctx error");

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

        // Provide size (32 is typically sufficient for most tokens) and Special::Tokenize
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