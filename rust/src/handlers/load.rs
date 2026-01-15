// src/handlers/load.rs
use crate::model::load_model_strategy;
use crate::state::{AccelerationType, AppState};
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio_util::sync::CancellationToken;

const MODEL_PATH: &str = "models/mistral-7b-instruct-v0.2.Q4_K_S.gguf";

#[derive(Deserialize)]
pub struct LoadRequest {
    #[serde(default = "default_gpu_layers")]
    pub gpu_layers: u32,
}

fn default_gpu_layers() -> u32 { 99 }

#[derive(Serialize)]
pub struct LoadResponse {
    pub status: String,
    pub acceleration: String,
    pub gpu_layers: u32,
}

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub model_loaded: bool,
    pub acceleration: String,
}

#[derive(Serialize)]
pub struct MetricsResponse {
    pub total_requests: u64,
    pub total_tokens_generated: u64,
    pub total_time_ms: u64,
}

pub async fn handle_load(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoadRequest>,
) -> Json<LoadResponse> {
    let model_path = PathBuf::from(MODEL_PATH);
    println!("🚀 Loading request received for: {:?}", model_path);

    // Try GPU Load
    let (model, accel, layers) = match load_model_strategy(&state.backend, &model_path, payload.gpu_layers) {
        Ok(m) => {
            println!("✅ GPU Acceleration Active (Layers: {})", payload.gpu_layers);
            (m, AccelerationType::GPU, payload.gpu_layers)
        }
        Err(e) => {
            println!("⚠️ GPU Load Failed: {}. Falling back to CPU...", e);
            match load_model_strategy(&state.backend, &model_path, 0) {
                Ok(m) => {
                    println!("✅ CPU Mode Active");
                    (m, AccelerationType::CPU, 0)
                }
                Err(e_cpu) => {
                    return Json(LoadResponse {
                        status: format!("failed: {}", e_cpu),
                        acceleration: "None".into(),
                        gpu_layers: 0,
                    });
                }
            }
        }
    };

    let mut model_state = state.model_state.write().await;
    model_state.model = Some(model);
    model_state.acceleration = accel;
    model_state.gpu_layers = layers;

    Json(LoadResponse {
        status: "loaded".to_string(),
        acceleration: accel.to_string(),
        gpu_layers: layers,
    })
}

pub async fn handle_unload(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let mut model_state = state.model_state.write().await;
    model_state.model = None;
    model_state.acceleration = AccelerationType::Unloaded;
    model_state.gpu_layers = 0;
    
    println!("🔴 Model unloaded");
    Json(serde_json::json!({ "status": "unloaded" }))
}

pub async fn handle_health(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    let model_state = state.model_state.read().await;
    Json(HealthResponse {
        status: "healthy".to_string(),
        model_loaded: model_state.model.is_some(),
        acceleration: model_state.acceleration.to_string(),
    })
}

pub async fn handle_metrics(State(state): State<Arc<AppState>>) -> Json<MetricsResponse> {
    let metrics = state.metrics.read().await;
    Json(MetricsResponse {
        total_requests: metrics.total_requests,
        total_tokens_generated: metrics.total_tokens_generated,
        total_time_ms: metrics.total_time_ms,
    })
}

pub async fn handle_cancel(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let token = state.cancel_token.read().await;
    token.cancel();
    drop(token);
    
    // Reset the token for next time
    let mut token_write = state.cancel_token.write().await;
    *token_write = CancellationToken::new();
    
    Json(serde_json::json!({ "status": "cancelled" }))
}