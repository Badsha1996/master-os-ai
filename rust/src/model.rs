use anyhow::Result;
use llama_cpp_2::{
    llama_backend::LlamaBackend,
    model::{params::LlamaModelParams, LlamaModel},
};
use std::path::PathBuf;

pub fn load_model_strategy(
    backend: &LlamaBackend,
    path: &PathBuf,
    gpu_layers: u32,
) -> Result<LlamaModel> {
    println!("🔄 Attempting to load model from: {:?}", path);
    println!("   GPU Layers requested: {}", gpu_layers);
    
    // Verify file exists
    if !path.exists() {
        return Err(anyhow::anyhow!(
            "Model file not found at {:?}. Please check the path.",
            path
        ));
    }
    
    let params = LlamaModelParams::default()
        .with_n_gpu_layers(gpu_layers);
    
    println!("   Loading with params: gpu_layers={}", gpu_layers);
    
    match LlamaModel::load_from_file(backend, path, &params) {
        Ok(model) => {
            println!("✅ Model loaded successfully!");
            Ok(model)
        }
        Err(e) => {
            eprintln!("❌ Model load failed: {}", e);
            Err(anyhow::anyhow!("Failed to load model from {:?}: {}", path, e))
        }
    }
}