// src/state.rs
use llama_cpp_2::{llama_backend::LlamaBackend, model::LlamaModel};
use serde::Serialize;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio_util::sync::CancellationToken;

#[derive(Clone, Copy, Debug, Serialize, PartialEq)]
pub enum AccelerationType {
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

pub struct ModelState {
    pub model: Option<LlamaModel>,
    pub acceleration: AccelerationType,
    pub gpu_layers: u32,
}

pub struct Metrics {
    pub total_requests: u64,
    pub total_tokens_generated: u64,
    pub total_time_ms: u64,
}

/// The global application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    // Backend is thread-safe and needed for context creation
    pub backend: Arc<LlamaBackend>,
    // RwLock allows multiple readers (inference) or one writer (load/unload)
    pub model_state: Arc<RwLock<ModelState>>,
    pub metrics: Arc<RwLock<Metrics>>,
    // Global cancellation token (simplistic implementation)
    pub cancel_token: Arc<RwLock<CancellationToken>>,
}