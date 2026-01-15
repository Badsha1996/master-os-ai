// src/inference.rs
use crate::state::ModelState;
use anyhow::{anyhow, Result};
use llama_cpp_2::{
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::{AddBos, Special},
    sampling::LlamaSampler,
};
use std::num::NonZeroU32;
use tokio::sync::mpsc::UnboundedSender;
use tokio_util::sync::CancellationToken;

#[derive(Debug)]
pub struct InferenceRequest {
    pub prompt: String,
    pub max_tokens: u32,
    pub temperature: f32,
    pub stop_sequences: Vec<String>,
}

pub fn run_inference(
    backend: &LlamaBackend,
    model_state: &ModelState,
    request: InferenceRequest,
    tx: UnboundedSender<Result<String>>,
    cancel_token: CancellationToken,
) -> Result<u32> {
    println!("🤖 Starting inference");
    println!("   Prompt length: {} chars", request.prompt.len());
    println!("   Max tokens: {}", request.max_tokens);
    println!("   Temperature: {}", request.temperature);
    
    // 1. Validate Model
    let model = match model_state.model.as_ref() {
        Some(m) => m,
        None => {
            let err_msg = "Model not loaded. Please load model first.";
            let _ = tx.send(Err(anyhow!(err_msg)));
            return Err(anyhow!(err_msg));
        }
    };

    // 2. Create Context with optimized parameters
    let n_ctx = 4096; // Increased context window
    let n_batch = 512;
    
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(Some(NonZeroU32::new(n_ctx).unwrap()))
        .with_n_batch(n_batch);

    let mut ctx = match model.new_context(backend, ctx_params) {
        Ok(c) => {
            println!("✅ Context created (n_ctx={}, n_batch={})", n_ctx, n_batch);
            c
        }
        Err(e) => {
            let err_msg = format!("Failed to create context: {}", e);
            let _ = tx.send(Err(anyhow!(err_msg.clone())));
            return Err(anyhow!(err_msg));
        }
    };

    // 3. Tokenize with validation
    let tokens = match model.str_to_token(&request.prompt, AddBos::Always) {
        Ok(t) => {
            println!("✅ Tokenized: {} tokens", t.len());
            
            // Validate token count
            if t.is_empty() {
                let err_msg = "Tokenization produced no tokens";
                let _ = tx.send(Err(anyhow!(err_msg)));
                return Err(anyhow!(err_msg));
            }
            
            // Check if prompt fits in context
            let available_ctx = (n_ctx as usize).saturating_sub(request.max_tokens as usize);
            if t.len() > available_ctx {
                let err_msg = format!(
                    "Prompt too long: {} tokens (max: {} with {} reserved for output)",
                    t.len(), available_ctx, request.max_tokens
                );
                let _ = tx.send(Err(anyhow!(err_msg.clone())));
                return Err(anyhow!(err_msg));
            }
            
            t
        }
        Err(e) => {
            let err_msg = format!("Tokenization failed: {}", e);
            let _ = tx.send(Err(anyhow!(err_msg.clone())));
            return Err(anyhow!(err_msg));
        }
    };

    // 4. Evaluate prompt tokens
    let mut batch = LlamaBatch::new(n_ctx as usize, 1);
    
    println!("📝 Processing prompt tokens...");
    for (i, &token) in tokens.iter().enumerate() {
        let is_last = i == tokens.len() - 1;
        if let Err(e) = batch.add(token, i as i32, &[0], is_last) {
            let err_msg = format!("Failed to add token to batch: {}", e);
            let _ = tx.send(Err(anyhow!(err_msg.clone())));
            return Err(anyhow!(err_msg));
        }
    }

    if let Err(e) = ctx.decode(&mut batch) {
        let err_msg = format!("Failed to decode prompt: {}", e);
        let _ = tx.send(Err(anyhow!(err_msg.clone())));
        return Err(anyhow!(err_msg));
    }

    println!("✅ Prompt processed successfully");

    // 5. Generate tokens with optimized sampling
    let safe_temp = request.temperature.clamp(0.1, 2.0);
    let mut n_cur = tokens.len() as i32;
    let mut n_decoded = 0u32;
    let mut accumulated = String::new();

    // Create optimized sampler chain
    let mut sampler = LlamaSampler::chain_simple(vec![
        LlamaSampler::temp(safe_temp),
        LlamaSampler::top_k(40),         // Top-K sampling
        LlamaSampler::top_p(0.95, 1),    // Nucleus sampling
        LlamaSampler::dist(42),          // Random seed
    ]);

    println!("🔄 Generating tokens...");

    loop {
        // Check cancellation
        if cancel_token.is_cancelled() {
            println!("⚠️ Generation cancelled by user");
            break;
        }

        // Check max tokens
        if n_decoded >= request.max_tokens {
            println!("✅ Max tokens reached: {}", n_decoded);
            break;
        }

        // Sample next token
        let new_token = sampler.sample(&ctx, batch.n_tokens() - 1);

        // Check for EOS
        if new_token == model.token_eos() {
            println!("✅ EOS token reached");
            break;
        }

        // Convert token to string
        let piece = match model.token_to_str_with_size(new_token, 32, Special::Tokenize) {
            Ok(s) => s,
            Err(e) => {
                println!("⚠️ Token decode error: {}", e);
                String::new()
            }
        };

        // Accumulate and send
        if !piece.is_empty() {
            accumulated.push_str(&piece);
            n_decoded += 1;

            // Send token to stream
            if tx.send(Ok(piece)).is_err() {
                println!("⚠️ Receiver dropped, stopping generation");
                break;
            }

            // Check stop sequences
            if !request.stop_sequences.is_empty() {
                for stop_seq in &request.stop_sequences {
                    if accumulated.contains(stop_seq) {
                        println!("✅ Stop sequence detected: '{}'", stop_seq);
                        return Ok(n_decoded);
                    }
                }
            }
        }

        // Prepare next batch
        batch.clear();
        if let Err(e) = batch.add(new_token, n_cur, &[0], true) {
            println!("❌ Failed to add token to batch: {}", e);
            break;
        }
        
        n_cur += 1;

        // Decode next token
        if let Err(e) = ctx.decode(&mut batch) {
            println!("❌ Decode failed: {}", e);
            let _ = tx.send(Err(anyhow!("Decode error: {}", e)));
            break;
        }

        // Periodic status update (every 50 tokens)
        if n_decoded % 50 == 0 {
            println!("   Generated {} tokens...", n_decoded);
        }
    }

    println!("✅ Generation complete: {} tokens", n_decoded);
    Ok(n_decoded)
}