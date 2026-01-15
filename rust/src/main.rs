// src/main.rs
mod handlers;
mod inference;
mod model;
mod state;

use anyhow::Result;
use axum::{
    routing::{get, post},
    Router,
};
use handlers::{load, stream};
use llama_cpp_2::llama_backend::LlamaBackend;
use state::{AppState, Metrics, ModelState};
use std::sync::Arc;
use tokio::sync::RwLock;

#[tokio::main]
async fn main() -> Result<()> {
    // 1. Logging
    tracing_subscriber::fmt::init();
    println!("🚀 Master-OS AI Core Initializing...");

    // 2. Initialize Backend (Global) - CRITICAL FIX
    let backend = match LlamaBackend::init() {
        Ok(b) => {
            println!("✅ LlamaBackend initialized successfully");
            Arc::new(b)
        }
        Err(e) => {
            eprintln!("❌ FATAL: Failed to initialize LlamaBackend: {}", e);
            eprintln!("   Make sure CUDA/Metal/Vulkan drivers are installed");
            std::process::exit(1);
        }
    };

    // 3. Initialize State
    let state = Arc::new(AppState {
        backend,
        model_state: Arc::new(RwLock::new(ModelState {
            model: None,
            acceleration: state::AccelerationType::Unloaded,
            gpu_layers: 0,
        })),
        metrics: Arc::new(RwLock::new(Metrics {
            total_requests: 0,
            total_tokens_generated: 0,
            total_time_ms: 0,
        })),
        cancel_token: Arc::new(RwLock::new(tokio_util::sync::CancellationToken::new())),
    });

    // 4. Router Setup
    let app = Router::new()
        // Model Lifecycle
        .route("/load", post(load::handle_load))
        .route("/unload", post(load::handle_unload))
        // Inference
        .route("/predict/stream", post(stream::handle_predict_stream))
        // Operations
        .route("/health", get(load::handle_health))
        .route("/metrics", get(load::handle_metrics))
        .route("/cancel", post(load::handle_cancel))
        .with_state(state);

    // 5. Start Server
    let listener = tokio::net::TcpListener::bind("127.0.0.1:5005").await?;
    println!("📡 Master-OS API ready at http://127.0.0.1:5005");
    println!("   Endpoints:");
    println!("   POST /load            (gpu_layers: u32)");
    println!("   POST /predict/stream  (SSE Stream)");
    
    axum::serve(listener, app).await?;
    Ok(())
}