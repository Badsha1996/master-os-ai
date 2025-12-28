import asyncio
import json
import logging
import os
import re
from typing import Optional, Dict, Any
from enum import Enum
import httpx

'''
Loggers 
'''
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("llm_client")

'''
Exceptions
'''
class AgentError(Exception):
    pass

class LLMConnectionError(Exception):
    pass

class ModelNotLoadedError(Exception):
    pass

'''
Enums
'''
class AccelerationType(str, Enum):
    GPU = "GPU"
    CPU = "CPU"
    NONE = "None"

'''
LLM Client with SSR Flow
'''
class LLMClient:
    def __init__(self, rust_url: Optional[str] = None):
        self.rust_url = rust_url or os.getenv("RUST_URL", "http://127.0.0.1:5005")
        self.headers = {"Content-Type": "application/json"}
        self._is_loaded = False
        self._acceleration_type: Optional[AccelerationType] = None
        self._gpu_layers: int = 0
        
    async def initialize(self, gpu_layers: int = 99, cold_start: bool = True) -> Dict[str, Any]:
        """
        Initialize the LLM server with optional cold start.
        
        Args:
            gpu_layers: Number of layers to offload to GPU (99 = all, 0 = CPU only)
            cold_start: If True, loads model immediately. If False, defers to first use.
        
        Returns:
            Dict with status, acceleration type, and GPU layers
        """
        logger.info("🔧 Initializing LLM Client...")
        
        # Check server health first
        health = await self.health_check()
        if not health.get("status") == "healthy":
            raise LLMConnectionError("Server is not healthy")
        
        # If model already loaded, return current state
        if health.get("model_loaded"):
            logger.info(f"✅ Model already loaded ({health.get('acceleration')})")
            self._is_loaded = True
            self._acceleration_type = AccelerationType(health.get("acceleration", "None"))
            return {
                "status": "already_loaded",
                "acceleration": self._acceleration_type.value,
                "gpu_layers": self._gpu_layers
            }
        
        # Cold start: load model immediately
        if cold_start:
            return await self.load_model(gpu_layers)
        
        logger.info("⏳ Deferred loading (will load on first prediction)")
        return {
            "status": "deferred",
            "acceleration": "None",
            "gpu_layers": 0
        }
    
    async def load_model(self, gpu_layers: int = 99) -> Dict[str, Any]:
        """
        Explicitly load the model.
        
        Args:
            gpu_layers: Number of layers to offload to GPU
            
        Returns:
            Dict with load status, acceleration type, and GPU layers
        """
        logger.info(f"📦 Loading model (GPU layers: {gpu_layers})...")
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:  # Long timeout for model loading
                response = await client.post(
                    f"{self.rust_url}/load",
                    json={"gpu_layers": gpu_layers},
                    headers=self.headers
                )
                response.raise_for_status()
                
                data = response.json()
                self._is_loaded = True
                self._acceleration_type = AccelerationType(data.get("acceleration", "CPU"))
                self._gpu_layers = data.get("gpu_layers", 0)
                
                # Log with appropriate emoji
                emoji = "🚀" if self._acceleration_type == AccelerationType.GPU else "🐢"
                logger.info(
                    f"{emoji} Model loaded successfully! "
                    f"Acceleration: {self._acceleration_type.value}, "
                    f"GPU Layers: {self._gpu_layers}"
                )
                
                return {
                    "status": data.get("status"),
                    "acceleration": self._acceleration_type.value,
                    "gpu_layers": self._gpu_layers
                }
                
        except httpx.HTTPError as e:
            logger.error(f"❌ Failed to load model: {e}")
            raise LLMConnectionError(f"Model load failed: {e}") from e
    
    async def unload_model(self) -> Dict[str, Any]:
        """
        Unload the model to free memory.
        
        Returns:
            Dict with unload status
        """
        logger.info("🗑️ Unloading model...")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.rust_url}/unload",
                    headers=self.headers
                )
                response.raise_for_status()
                
                data = response.json()
                self._is_loaded = False
                self._acceleration_type = None
                self._gpu_layers = 0
                
                logger.info("✅ Model unloaded successfully")
                return data
                
        except httpx.HTTPError as e:
            logger.error(f"❌ Failed to unload model: {e}")
            raise LLMConnectionError(f"Model unload failed: {e}") from e
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check server health and model status.
        
        Returns:
            Dict with status, model_loaded, and acceleration type
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.rust_url}/health",
                    headers=self.headers
                )
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPError as e:
            logger.error(f"❌ Health check failed: {e}")
            raise LLMConnectionError(f"Health check failed: {e}") from e
    
    async def get_metrics(self) -> Dict[str, Any]:
        """
        Get usage metrics from the server.
        
        Returns:
            Dict with total_requests, total_tokens_generated, total_time_ms, and averages
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.rust_url}/metrics",
                    headers=self.headers
                )
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPError as e:
            logger.error(f"❌ Failed to get metrics: {e}")
            raise LLMConnectionError(f"Metrics fetch failed: {e}") from e
    def _clean_json_response(self, text: str) -> str:
        """Extract and clean JSON from LLM output"""
        # Remove markdown code blocks
        text = re.sub(r'```json\s*|\s*```', '', text)
        
        # Try to find JSON object
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text)
        if json_match:
            return json_match.group(0)
    
        return text.strip()
    async def react(
        self, 
        prompt: str, 
        max_tokens: int = 1024,
        temperature: float = 0.1,
        stop: Optional[list] = None,
        max_retries: int = 3,
        auto_load: bool = True
    ) -> str:
        """
        Generate a response using the ReAct pattern.
        
        Args:
            prompt: The input prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            stop: Stop sequences
            max_retries: Number of retry attempts
            auto_load: If True and model not loaded, loads it automatically
            
        Returns:
            Generated text as JSON string
        """
        # Check if model is loaded
        if not self._is_loaded:
            if auto_load:
                logger.warning("⚠️ Model not loaded, auto-loading...")
                await self.load_model()
            else:
                raise ModelNotLoadedError("Model not loaded. Call load_model() first or set auto_load=True")
        
        # Format prompt with strong system instruction
        formatted_prompt = (
            f"<s>[INST] You are an autonomous agent. "
            f"Respond ONLY with valid JSON. Do not write explanations.\n\n"
            f"{prompt} [/INST]"
        )

        payload = {
            "prompt": formatted_prompt,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stop": stop or ["</s>", "Step:", "User:"]
        }

        for attempt in range(max_retries):
            raw_content = "N/A"
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        f"{self.rust_url}/predict",
                        json=payload,
                        headers=self.headers
                    )
                    response.raise_for_status()
                    
                    data = response.json()
                    raw_content = data.get("text", "").strip()
                    tokens_generated = data.get("tokens_generated", 0)
                    time_ms = data.get("time_ms", 0)

                    # Extract and validate JSON
                    json_str = self._clean_json_response(raw_content)
                    json.loads(json_str)  # Validate
                    
                    logger.info(
                        f"✅ Generated {tokens_generated} tokens in {time_ms}ms "
                        f"({tokens_generated / (time_ms / 1000):.1f} tokens/sec)"
                    )
                    
                    return json_str

            except (httpx.HTTPError, ValueError, json.JSONDecodeError, httpx.TimeoutException) as e:
                wait_time = (2 ** attempt)
                logger.warning(
                    f"⚠️ LLM Attempt {attempt + 1}/{max_retries} failed: {e}. "
                    f"Retrying in {wait_time}s..."
                )
                await asyncio.sleep(wait_time)
                
                if attempt == max_retries - 1:
                    logger.error(f"❌ Final LLM Failure. Raw Output: {raw_content}")
                    raise LLMConnectionError(f"Max retries reached. Error: {e}") from e

        return ""

    def _extract_json(self, text: str) -> str:
        """Extract JSON from potentially messy LLM output."""
        # Remove markdown code fences
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*", "", text)
        
        # Find JSON object
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        
        if match:
            candidate = match.group(1)
            # Remove trailing commas
            candidate = re.sub(r",\s*\}", "}", candidate)
            return candidate.strip()
            
        return text.strip()
    
    @property
    def is_loaded(self) -> bool:
        """Check if model is currently loaded."""
        return self._is_loaded
    
    @property
    def acceleration_type(self) -> Optional[AccelerationType]:
        """Get current acceleration type (GPU/CPU/None)."""
        return self._acceleration_type
    
    @property
    def gpu_layers(self) -> int:
        """Get number of GPU layers being used."""
        return self._gpu_layers


'''
Convenience function for quick initialization
'''
async def create_llm_client(
    rust_url: Optional[str] = None,
    gpu_layers: int = 99,
    cold_start: bool = True
) -> LLMClient:
    """
    Create and initialize an LLM client.
    
    Args:
        rust_url: Rust server URL (defaults to http://127.0.0.1:5005)
        gpu_layers: Number of GPU layers to use
        cold_start: If True, loads model immediately
        
    Returns:
        Initialized LLMClient instance
    """
    client = LLMClient(rust_url)
    await client.initialize(gpu_layers=gpu_layers, cold_start=cold_start)
    return client


'''
Example Usage
'''
async def main():
    # Option 1: Cold start (load immediately)
    client = await create_llm_client(cold_start=True)
    
    # Option 2: Deferred loading (load on first use)
    # client = await create_llm_client(cold_start=False)
    
    # Option 3: Manual control
    # client = LLMClient()
    # await client.load_model(gpu_layers=99)
    
    try:
        # Check status
        print(f"Model loaded: {client.is_loaded}")
        print(f"Acceleration: {client.acceleration_type}")
        print(f"GPU Layers: {client.gpu_layers}")
        
        # Get metrics
        metrics = await client.get_metrics()
        print(f"Metrics: {metrics}")
        
        
    finally:
        # Always unload when done to free memory
        print("Cleaning up...")
        await client.unload_model()
        print("Done!")


'''
Global client instance for easy import
'''
llm_client = LLMClient()


if __name__ == "__main__":
    asyncio.run(main())