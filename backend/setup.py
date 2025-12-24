from pathlib import Path
from llama_cpp import Llama

BASE_DIR = Path(__file__).resolve().parent  # backend/
MODEL_PATH = BASE_DIR / "models" / "mistral-7b-instruct-v0.2.Q4_K_S.gguf"

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")


llm = Llama(
    model_path=str(MODEL_PATH),
    n_ctx=4096,
    n_gpu_layers=28, 
    n_threads=8,
    n_batch=512,
    verbose=False,
    seed=42,
    chat_format="chatml"
)


