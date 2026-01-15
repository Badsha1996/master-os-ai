// src/handlers/stream.rs
use crate::inference::{self, InferenceRequest};
use crate::state::AppState;
use axum::{
    extract::State,
    response::sse::{Event, KeepAlive},
    response::Sse,
    Json,
};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::mpsc;
use tokio_stream::wrappers::UnboundedReceiverStream;
use tokio_stream::StreamExt;

#[derive(Deserialize)]
pub struct StreamRequest {
    pub prompt: String,
    #[serde(default = "default_max")]
    pub max_tokens: u32,
    #[serde(default)]
    pub stop: Vec<String>,
    #[serde(default = "default_temp")]
    pub temperature: f32,
}

#[derive(Serialize)]
struct TokenResponse {
    text: String,
}

fn default_max() -> u32 { 2048 }
fn default_temp() -> f32 { 0.7 }

pub async fn handle_predict_stream(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<StreamRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    
    let start_time = Instant::now();
    let (tx, rx) = mpsc::unbounded_channel();
    let state_clone = state.clone();

    tokio::task::spawn_blocking(move || {
        let model_guard = state_clone.model_state.blocking_read();
        
        let req = InferenceRequest {
            prompt: payload.prompt,
            max_tokens: payload.max_tokens,
            temperature: payload.temperature,
            stop_sequences: payload.stop,
        };

        let cancel_token = state_clone.cancel_token.blocking_read().clone();

        match inference::run_inference(&state_clone.backend, &model_guard, req, tx.clone(), cancel_token) {
            Ok(count) => {
                let mut m = state_clone.metrics.blocking_write();
                m.total_requests += 1;
                m.total_tokens_generated += count as u64;
                m.total_time_ms += start_time.elapsed().as_millis() as u64;
            }
            Err(e) => {
                let _ = tx.send(Err(e));
            }
        }
    });

    let stream = UnboundedReceiverStream::new(rx).map(|result| {
        match result {
            Ok(text) => {
                // Wrap the text in a JSON object
                let response = TokenResponse { text: text.clone() };
                match serde_json::to_string(&response) {
                    Ok(json_str) => Ok(Event::default().data(json_str)),
                    Err(_) => Ok(Event::default().data(text)), // Fallback to raw text
                }
            }
            Err(e) => {
                let error_json = serde_json::json!({"error": e.to_string()});
                Ok(Event::default().event("error").data(error_json.to_string()))
            }
        }
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}