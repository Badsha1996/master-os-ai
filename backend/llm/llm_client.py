import asyncio
import json
import logging
import os
from typing import Optional, Dict, Any, AsyncIterator
from enum import Enum
import httpx

logger = logging.getLogger("llm_client")

class AgentError(Exception): 
    pass

class CancelledException(Exception): 
    pass

class AccelerationType(str, Enum):
    GPU = "GPU"
    CPU = "CPU"
    NONE = "None"

class LLMClient:
    def __init__(self, rust_url: Optional[str] = None):
        self.rust_url = rust_url or os.getenv("RUST_URL", "http://127.0.0.1:5005")
        self.headers = {"Content-Type": "application/json"}
        
        self._http = httpx.AsyncClient(
            timeout=httpx.Timeout(300.0, connect=10.0),  # Longer timeout for ReAct loops
            limits=httpx.Limits(
                max_keepalive_connections=10,
                max_connections=20,
                keepalive_expiry=60.0
            )
        )
        
        self._is_loaded = False
        self._acceleration_type = None
        self._gpu_layers = 0
        self._load_lock = asyncio.Lock()
        self._default_gpu_layers = 99
        self._cancel_event = asyncio.Event()

    async def initialize(self, gpu_layers: int = 99, cold_start: bool = True) -> None:
        """Initialize the LLM client and optionally load the model."""
        self._default_gpu_layers = gpu_layers
        
        try:
            health = await self.health_check()
            if health.get("status") == "healthy" and health.get("model_loaded"):
                self._is_loaded = True
                self._acceleration_type = health.get("acceleration")
                logger.info(f"✅ Model already loaded with {self._acceleration_type} acceleration")
                return
        except Exception as e:
            logger.warning(f"⚠️ Health check failed during init: {e}")
        
        if cold_start:
            await self.load_model(gpu_layers=gpu_layers)

    async def load_model(self, gpu_layers: int = 99, retry: bool = True) -> Dict[str, Any]:
        """Load the model with automatic fallback to CPU if GPU fails."""
        async with self._load_lock:
            try:
                logger.info(f"🚀 Loading model with {gpu_layers} GPU layers...")
                
                resp = await self._http.post(
                    f"{self.rust_url}/load", 
                    json={"gpu_layers": gpu_layers}, 
                    timeout=180.0
                )
                resp.raise_for_status()
                
                data = resp.json()
                self._is_loaded = True
                self._acceleration_type = data.get("acceleration", "Unknown")
                self._gpu_layers = data.get("gpu_layers", 0)
                
                logger.info(f"✅ Model loaded: {self._acceleration_type} acceleration")
                return data
                
            except Exception as e:
                logger.error(f"❌ Model load failed: {e}")
                
                if retry and gpu_layers > 0:
                    logger.warning("⚠️ Attempting CPU fallback...")
                    return await self.load_model(gpu_layers=0, retry=False)
                
                raise AgentError(f"Model load failed: {e}")

    async def ensure_loaded(self) -> bool:
        """Ensure model is loaded, with auto-recovery if needed."""
        try:
            health = await self.health_check()
            if health.get("model_loaded"):
                return True
            
            logger.warning("⚠️ Model not loaded, attempting auto-recovery...")
            await self.load_model(gpu_layers=self._default_gpu_layers)
            return True
            
        except Exception as e:
            logger.error(f"❌ Auto-recovery failed: {e}")
            return False

    async def health_check(self) -> Dict[str, Any]:
        """Check the health status of the Rust backend."""
        try:
            resp = await self._http.get(f"{self.rust_url}/health", timeout=5.0)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.warning(f"Health check failed: {e}")
            return {"status": "unhealthy", "model_loaded": False}

    async def stream(self, prompt: str, context: str = "") -> AsyncIterator[str]:
        """
        Stream tokens from the model.
        For ReAct, the prompt should already be formatted by the calling code.
        """
        if not await self.ensure_loaded():
            raise AgentError("Failed to ensure model is loaded")

        # Use prompt directly - ReAct formatting done in chat.py
        payload = {
            "prompt": prompt,
            "max_tokens": 2048,
            "temperature": 0.7,
            "stream": True,
            "stop": ["</s>", "[INST]", "User:", "Observation:","Observation"]  # Stop before observations
        }

        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with self._http.stream(
                    "POST", 
                    f"{self.rust_url}/predict/stream", 
                    json=payload,
                    timeout=None
                ) as response:
                    response.raise_for_status()
                    
                    buffer = ""
                    async for line in response.aiter_lines():
                        if self._cancel_event.is_set():
                            logger.info("Generation cancelled by user")
                            raise CancelledException("Generation cancelled")
                        
                        if line.startswith("data:"):
                            data_str = line[5:].strip()
                            
                            if not data_str:
                                continue
                            
                            try:
                                # Parse the JSON response from Rust
                                data = json.loads(data_str)
                                token = data.get("text", "")
                                
                                if token:
                                    buffer += token
                                    
                                    # Yield the token wrapped in JSON for consistent handling
                                    yield json.dumps({"text": token})
                                    
                            except json.JSONDecodeError:
                                # Fallback: treat as plain text
                                yield json.dumps({"text": data_str})
                    
                    return
                    
            except CancelledException:
                raise
            except Exception as e:
                logger.error(f"Stream error (attempt {attempt + 1}/{max_retries}): {e}")
                
                if attempt < max_retries - 1:
                    logger.warning("Attempting to recover connection...")
                    await asyncio.sleep(2 ** attempt)
                    
                    if not await self.ensure_loaded():
                        raise AgentError("Failed to recover model connection")
                else:
                    raise AgentError(f"Stream failed after {max_retries} attempts: {e}")

    async def cancel_all(self) -> Dict[str, str]:
        """Cancel ongoing generation."""
        self._cancel_event.set()
        
        try:
            await self._http.post(f"{self.rust_url}/cancel", timeout=5.0)
        except Exception as e:
            logger.warning(f"Cancel request failed: {e}")
        
        await asyncio.sleep(0.5)
        self._cancel_event.clear()
        
        return {"status": "cancelled"}

    async def unload_model(self) -> None:
        """Unload the model from memory."""
        try:
            await self._http.post(f"{self.rust_url}/unload", timeout=10.0)
            self._is_loaded = False
            logger.info("Model unloaded")
        except Exception as e:
            logger.error(f"Unload failed: {e}")

    async def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics from the Rust backend."""
        try:
            resp = await self._http.get(f"{self.rust_url}/metrics", timeout=5.0)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"Failed to get metrics: {e}")
            return {}

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._http.aclose()
        logger.info("LLM client closed")