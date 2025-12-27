use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response, Sse},
    routing::{get, post},
    Json, Router,
};
use axum::response::sse::{Event, KeepAlive};
use llama_cpp_2::{
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::params::LlamaModelParams,
    model::{AddBos, LlamaModel, Special},
    sampling::LlamaSampler,
};
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant}; 
use tokio::sync::RwLock;
use tokio_stream::Stream;
use futures::stream;

// --- Error Handling ---
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

// --- Request/Response Types ---
#[derive(Deserialize)]
struct LoadRequest {
    #[serde(default = "default_gpu_layers")]
    gpu_layers: u32,
}

fn default_gpu_layers() -> u32 {
    99
}

const MODEL_PATH: &str = "models/mistral-7b-instruct-v0.2.Q4_K_S.gguf";

#[derive(Serialize)]
struct LoadResponse {
    status: String,
    acceleration: String,
    gpu_layers: u32,
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
    0.7
}

#[derive(Serialize)]
struct PredictResponse {
    text: String,
    tokens_generated: u32,
    time_ms: u64,
}



#[derive(Serialize)]
struct HealthResponse {
    status: String,
    model_loaded: bool,
    acceleration: String,
}

#[derive(Serialize)]
struct MetricsResponse {
    total_requests: u64,
    total_tokens_generated: u64,
    total_time_ms: u64,
    average_tokens_per_request: f64,
    average_time_per_request_ms: f64,
}

// --- Application State ---
#[derive(Clone, Copy, Debug, Serialize)]
enum AccelerationType {
    GPU,
    CPU,
    Unloaded,
}

impl std::fmt::Display for AccelerationType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AccelerationType::GPU => write!(f, "GPU"),
            AccelerationType::CPU => write!(f, "CPU"),
            AccelerationType::Unloaded => write!(f, "None"),
        }
    }
}

struct ModelState {
    model: Option<LlamaModel>,
    acceleration: AccelerationType,
    gpu_layers: u32,
}

struct Metrics {
    total_requests: u64,
    total_tokens_generated: u64,
    total_time_ms: u64,
}

#[derive(Clone)]
struct AppState {
    backend: Arc<LlamaBackend>,
    model_state: Arc<RwLock<ModelState>>,
    metrics: Arc<RwLock<Metrics>>,
}

// --- Model Loading Strategy ---
fn load_model_strategy(
    backend: &LlamaBackend,
    path: &PathBuf,
    gpu_layers: u32,
) -> anyhow::Result<LlamaModel> {
    let params = LlamaModelParams::default().with_n_gpu_layers(gpu_layers);
    LlamaModel::load_from_file(backend, path, &params)
        .map_err(|e| anyhow::anyhow!("Failed to load model: {}", e))
}

// --- Handlers ---
async fn handle_load(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoadRequest>,
) -> Result<Json<LoadResponse>, AppError> {
    let model_path = PathBuf::from(MODEL_PATH);

    println!("🚀 Loading model from: {:?}", model_path);

    // Try GPU first
    let (model, acceleration, gpu_layers) = match load_model_strategy(
        &state.backend,
        &model_path,
        payload.gpu_layers,
    ) {
        Ok(m) => {
            println!("✅ GPU Acceleration Active (Layers: {})", payload.gpu_layers);
            (m, AccelerationType::GPU, payload.gpu_layers)
        }
        Err(e) => {
            println!("⚠️ GPU Load Failed: {}. Falling back to CPU...", e);
            let m = load_model_strategy(&state.backend, &model_path, 0)?;
            println!("✅ CPU Mode Active");
            (m, AccelerationType::CPU, 0)
        }
    };

    let mut model_state = state.model_state.write().await;
    model_state.model = Some(model);
    model_state.acceleration = acceleration;
    model_state.gpu_layers = gpu_layers;

    Ok(Json(LoadResponse {
        status: "loaded".to_string(),
        acceleration: acceleration.to_string(),
        gpu_layers,
    }))
}

async fn handle_unload(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let mut model_state = state.model_state.write().await;
    model_state.model = None;
    model_state.acceleration = AccelerationType::Unloaded;
    model_state.gpu_layers = 0;

    println!("🔴 Model unloaded");

    Json(serde_json::json!({
        "status": "unloaded"
    }))
}

async fn handle_health(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    let model_state = state.model_state.read().await;

    Json(HealthResponse {
        status: "healthy".to_string(),
        model_loaded: model_state.model.is_some(),
        acceleration: model_state.acceleration.to_string(),
    })
}

async fn handle_metrics(State(state): State<Arc<AppState>>) -> Json<MetricsResponse> {
    let metrics = state.metrics.read().await;

    let avg_tokens = if metrics.total_requests > 0 {
        metrics.total_tokens_generated as f64 / metrics.total_requests as f64
    } else {
        0.0
    };

    let avg_time = if metrics.total_requests > 0 {
        metrics.total_time_ms as f64 / metrics.total_requests as f64
    } else {
        0.0
    };

    Json(MetricsResponse {
        total_requests: metrics.total_requests,
        total_tokens_generated: metrics.total_tokens_generated,
        total_time_ms: metrics.total_time_ms,
        average_tokens_per_request: avg_tokens,
        average_time_per_request_ms: avg_time,
    })
}

async fn handle_predict(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PredictRequest>,
) -> Result<Json<PredictResponse>, AppError> {
    let start_time = Instant::now();

    // Clone the model reference to avoid holding the lock
    let model_state = state.model_state.read().await;
    if model_state.model.is_none() {
        return Err(anyhow::anyhow!("Model not loaded. Call POST /load first").into());
    }
    drop(model_state); // Release lock immediately

    // Run the blocking inference in a spawn_blocking task
    let state_clone = state.clone();
    let result = tokio::task::spawn_blocking(move || {
        let model_state = state_clone.model_state.blocking_read();
        let model = model_state.model.as_ref().unwrap();

        // Create Context
        let n_ctx = 4096;
        let ctx_params = LlamaContextParams::default()
            .with_n_ctx(NonZeroU32::new(n_ctx))
            .with_offload_kqv(true);

        let mut ctx = model
            .new_context(&state_clone.backend, ctx_params)
            .map_err(|e| anyhow::anyhow!("Context creation failed: {}", e))?;

        // Tokenize
        let tokens = model
            .str_to_token(&payload.prompt, AddBos::Never)
            .map_err(|e| anyhow::anyhow!("Tokenization failed: {}", e))?;

        // Check context window
        if tokens.len() as u32 > n_ctx - payload.max_tokens {
            return Err(anyhow::anyhow!("Prompt is too long for context window"));
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
                LlamaSampler::top_p(0.95, 1),
                LlamaSampler::dist(rand::random()),
            ],
            false,
        );

        let mut generated_text = String::new();
        let mut n_cur = tokens.len() as i32;
        let mut tokens_generated = 0u32;

        // Generation Loop
        for _ in 0..payload.max_tokens {
            let token = sampler.sample(&ctx, batch.n_tokens() - 1);

            if token == model.token_eos() {
                break;
            }

            let piece = model
                .token_to_str_with_size(token, 32, Special::Tokenize)
                .unwrap_or_default();

            generated_text.push_str(&piece);
            tokens_generated += 1;

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

        Ok::<(String, u32), anyhow::Error>((generated_text, tokens_generated))
    })
    .await
    .map_err(|e| anyhow::anyhow!("Task join error: {}", e))??;

    let elapsed = start_time.elapsed().as_millis() as u64;
    let (generated_text, tokens_generated) = result;

    // Update metrics
    {
        let mut metrics = state.metrics.write().await;
        metrics.total_requests += 1;
        metrics.total_tokens_generated += tokens_generated as u64;
        metrics.total_time_ms += elapsed;
    }

    Ok(Json(PredictResponse {
        text: generated_text,
        tokens_generated,
        time_ms: elapsed,
    }))
}

async fn handle_predict_stream(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PredictRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, AppError> {
    let start_time = Instant::now();

    // Check if model is loaded
    let model_state = state.model_state.read().await;
    if model_state.model.is_none() {
        return Err(anyhow::anyhow!("Model not loaded. Call POST /load first").into());
    }
    drop(model_state);

    // Create a channel for streaming tokens
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<String, String>>(100);

    // Spawn blocking task for generation
    let state_clone = state.clone();
    tokio::task::spawn_blocking(move || {
        let model_state = state_clone.model_state.blocking_read();
        let model = model_state.model.as_ref().unwrap();

        let n_ctx = 4096;
        let ctx_params = LlamaContextParams::default()
            .with_n_ctx(NonZeroU32::new(n_ctx))
            .with_offload_kqv(true);

        let mut ctx = match model.new_context(&state_clone.backend, ctx_params) {
            Ok(ctx) => ctx,
            Err(e) => {
                let _ = tx.blocking_send(Err(format!("Context creation failed: {}", e)));
                return;
            }
        };

        let tokens = match model.str_to_token(&payload.prompt, AddBos::Never) {
            Ok(t) => t,
            Err(e) => {
                let _ = tx.blocking_send(Err(format!("Tokenization failed: {}", e)));
                return;
            }
        };

        if tokens.len() as u32 > n_ctx - payload.max_tokens {
            let _ = tx.blocking_send(Err("Prompt too long".to_string()));
            return;
        }

        let mut batch = LlamaBatch::new(n_ctx as usize, 1);
        for (i, token) in tokens.iter().enumerate() {
            if batch.add(*token, i as i32, &[0.into()], i == tokens.len() - 1).is_err() {
                let _ = tx.blocking_send(Err("Batch add failed".to_string()));
                return;
            }
        }

        if ctx.decode(&mut batch).is_err() {
            let _ = tx.blocking_send(Err("Initial decode failed".to_string()));
            return;
        }

        let mut sampler = LlamaSampler::chain(
            vec![
                LlamaSampler::temp(payload.temperature),
                LlamaSampler::top_p(0.95, 1),
                LlamaSampler::dist(rand::random()),
            ],
            false,
        );

        let mut generated_text = String::new();
        let mut n_cur = tokens.len() as i32;
        let mut tokens_generated = 0u32;

        for _ in 0..payload.max_tokens {
            let token = sampler.sample(&ctx, batch.n_tokens() - 1);

            if token == model.token_eos() {
                break;
            }

            let piece = model
                .token_to_str_with_size(token, 32, Special::Tokenize)
                .unwrap_or_default();

            generated_text.push_str(&piece);
            tokens_generated += 1;

            // Send token chunk
            if tx.blocking_send(Ok(piece.clone())).is_err() {
                // Channel closed, stop generation
                break;
            }

            if payload.stop.iter().any(|s| generated_text.contains(s)) {
                break;
            }

            batch.clear();
            if batch.add(token, n_cur, &[0.into()], true).is_err() {
                break;
            }

            if ctx.decode(&mut batch).is_err() {
                break;
            }

            n_cur += 1;
            if n_cur >= n_ctx as i32 {
                break;
            }
        }

        // Update metrics
        let elapsed = start_time.elapsed().as_millis() as u64;
        let mut metrics = state_clone.metrics.blocking_write();
        metrics.total_requests += 1;
        metrics.total_tokens_generated += tokens_generated as u64;
        metrics.total_time_ms += elapsed;
        
        // Drop tx to signal stream end
        drop(tx);
    });

    // Create SSE stream
    let stream = stream::unfold(rx, |mut rx| async move {
        match rx.recv().await {
            Some(Ok(chunk)) => {
                let event_data = serde_json::json!({
                    "type": "chunk",
                    "content": chunk,
                    "done": false
                });
                let event = Event::default()
                    .json_data(event_data)
                    .unwrap_or_else(|_| Event::default().data("error"));
                Some((Ok(event), rx))
            }
            Some(Err(error)) => {
                let event_data = serde_json::json!({
                    "type": "error",
                    "content": error,
                    "done": true
                });
                let event = Event::default()
                    .json_data(event_data)
                    .unwrap_or_else(|_| Event::default().data("error"));
                Some((Ok(event), rx))
            }
            None => {
                // Send final done event
                let event_data = serde_json::json!({
                    "type": "done",
                    "content": "",
                    "done": true
                });
                let event = Event::default()
                    .json_data(event_data)
                    .unwrap_or_else(|_| Event::default().data("error"));
                Some((Ok(event), rx))
            }
        }
    });

    Ok(Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(1))
            .text("keep-alive-text"),
    ))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    // Initialize backend
    let backend = Arc::new(LlamaBackend::init()?);

    let state = Arc::new(AppState {
        backend,
        model_state: Arc::new(RwLock::new(ModelState {
            model: None,
            acceleration: AccelerationType::Unloaded,
            gpu_layers: 0,
        })),
        metrics: Arc::new(RwLock::new(Metrics {
            total_requests: 0,
            total_tokens_generated: 0,
            total_time_ms: 0,
        })),
    });

    let app = Router::new()
        .route("/load", post(handle_load))
        .route("/unload", post(handle_unload))
        .route("/predict", post(handle_predict))
        .route("/predict/stream", post(handle_predict_stream))
        .route("/health", get(handle_health))
        .route("/metrics", get(handle_metrics))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:5005").await?;
    println!("📡 API ready at http://127.0.0.1:5005");
    println!("📡 Endpoints:");
    println!("   POST /load            - Load model");
    println!("   POST /unload          - Unload model");
    println!("   POST /predict         - Generate text (JSON)");
    println!("   POST /predict/stream  - Generate text (SSE)");
    println!("   GET  /health          - Check server status");
    println!("   GET  /metrics         - View usage metrics");

    axum::serve(listener, app).await?;
    Ok(())
}