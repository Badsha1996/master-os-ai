import asyncio
import json
import logging
import os
from typing import Optional, Dict, Any
from enum import Enum
import httpx
from utility.extract_json import extract_json
from typing import AsyncIterator

'''
Loggers 
'''
logger = logging.getLogger("llm_client")

'''
Exceptions
'''
class AgentError(Exception):
    pass

class CancelledException(Exception):
    """Raised when an operation is cancelled"""
    pass

'''
Enums
'''
class AccelerationType(str, Enum):
    GPU = "GPU"
    CPU = "CPU"
    NONE = "None"

'''
LLM Client with SSE Flow and Cancellation Support
'''
class LLMClient:
    def __init__(self, rust_url: Optional[str] = None):
        self.rust_url : str | None = rust_url or os.getenv("RUST_URL")
        self.headers : dict[str, str] = {"Content-Type": "application/json"}
        self._http = httpx.AsyncClient(timeout=60.0)
        self._is_loaded : bool = False
        self._acceleration_type: Optional[AccelerationType] = None
        self._gpu_layers: int = 0
        self._load_lock = asyncio.Lock()
        self._default_gpu_layers = None
        
        self._cancel_event = asyncio.Event()
        self._active_streams = set()
        self._stream_lock = asyncio.Lock()

        if not self.rust_url:
            raise ValueError("RUST_URL must be provided")
        
    async def initialize(
        self,
        gpu_layers: int = 99,
        cold_start: bool = True
    ) -> None:
        health = await self.health_check()
        self._default_gpu_layers = gpu_layers
        if health.get("status") != "healthy":
            raise AgentError("LLM server is not healthy")

        if cold_start:
            await self.load_model(gpu_layers=gpu_layers)

    async def load_model(self, gpu_layers: int = 99) -> Dict[str, Any]:
        try:
            async with self._load_lock:
                if self._is_loaded:
                    assert self._acceleration_type is not None
                    return {
                        "status": "already_loaded",
                        "acceleration": self._acceleration_type.value,
                        "gpu_layers": self._gpu_layers,
                    }

                response = await self._http.post(
                    f"{self.rust_url}/load",
                    json={"gpu_layers": gpu_layers},
                    headers=self.headers
                )
                response.raise_for_status()
                data = response.json()
                self._is_loaded = True
                self._acceleration_type = AccelerationType(data.get("acceleration", "CPU"))
                self._gpu_layers = data.get("gpu_layers", 0)
     
                return {
                    "status": data.get("status"),
                    "acceleration": self._acceleration_type.value,
                    "gpu_layers": self._gpu_layers
                }
                
        except httpx.HTTPError as e:
            logger.error(f"❌ Failed to load model: {e}")
            raise AgentError(f"Model load failed: {e}") from e
    
    async def unload_model(self) -> Dict[str, Any]:
        try:
            response = await self._http.post(
                f"{self.rust_url}/unload",
                headers=self.headers
            )
            response.raise_for_status()
            data = response.json()
            self._is_loaded = False
            self._acceleration_type = None
            self._gpu_layers = 0
            return data
                
        except httpx.HTTPError as e:
            logger.error(f"❌ Failed to unload model: {e}")
            raise AgentError(f"Model unload failed: {e}") from e
    
    async def health_check(self) -> Dict[str, Any]:
        try:
            response = await self._http.get(
                f"{self.rust_url}/health",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
                
        except httpx.HTTPError as e:
            logger.error(f"❌ Health check failed: {e}")
            raise AgentError(f"Health check failed: {e}") from e
    
    async def get_metrics(self) -> Dict[str, Any]:
        try:
            response = await self._http.get(
                f"{self.rust_url}/metrics",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
                
        except httpx.HTTPError as e:
            logger.error(f"❌ Failed to get metrics: {e}")
            raise AgentError(f"Metrics fetch failed: {e}") from e

    async def react(
        self, 
        prompt: str, 
        max_tokens: int = 1024,
        temperature: float = 0.1,
        stop: Optional[list] = None,
        max_retries: int = 3,
        auto_load: bool = True
    ) -> str:
        if not self._is_loaded:
            if auto_load:
                await self.load_model(self._default_gpu_layers or 99)
            else:
                raise AgentError("Model not loaded. Call load_model() first or set auto_load=True")
        
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
            response: Optional[str] = None
            try:
                http_response  = await self._http.post(
                    f"{self.rust_url}/predict",
                    json=payload,
                    headers=self.headers
                )
                http_response.raise_for_status()
                data = http_response.json()
                response = extract_json(data.get("text", "").strip())
                json.loads(response)  
                return response

            except (httpx.HTTPError, ValueError, json.JSONDecodeError, httpx.TimeoutException) as e:
                wait_time = (2 ** attempt)
                await asyncio.sleep(wait_time)
                if attempt == max_retries - 1:
                    logger.error(f"❌ Final LLM Failure. Raw Output: {response}")
                    raise AgentError(f"Max retries reached. Error: {e}") from e

        return ""
    
    async def stream(
        self,
        prompt: str,
        max_tokens: int = 1024,
        temperature: float = 0.1,
        stop: Optional[list] = None,
        auto_load: bool = True,
    ) -> AsyncIterator[str]:
        if not self._is_loaded:
            if auto_load:
                await self.load_model(self._default_gpu_layers or 99)
            else:
                raise AgentError("Model not loaded. Call load_model() first.")

        formatted_prompt = (
            f"<s>[INST] You are an autonomous agent. "
            f"Respond clearly and completely.\n\n"
            f"{prompt} [/INST]"
        )

        payload = {
            "prompt": formatted_prompt,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stop": stop or ["</s>", "[INST]", "Question:"], 
            "stream": True,
        }
        stream_id = id(asyncio.current_task())
        try:
            async with self._stream_lock:
                self._active_streams.add(stream_id)
            
            async with self._http.stream(
                "POST",
                f"{self.rust_url}/predict/stream",
                json=payload,
                headers=self.headers,
                timeout=None 
            ) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if self._cancel_event.is_set():
                        logger.warning(f"🛑 Stream {stream_id} cancelled")
                        raise CancelledException("Stream was cancelled")
                    
                    if not line or not line.startswith("data: "):
                        continue
                    
                    json_str = line[6:].strip() 
                    
                    try:
                        data = json.loads(json_str)
                        if data.get("type") == "chunk":
                            chunk = data.get("content")
                            if chunk:
                                yield chunk
                        
                        if data.get("done") is True or data.get("type") == "done":
                            logger.info(f"✅ Stream {stream_id} completed normally")
                            break 

                    except json.JSONDecodeError:
                        logger.warning(f"Failed to decode SSE line: {line}")
                        continue

        except CancelledException:
            logger.info(f"🛑 Stream {stream_id} cancelled by user")
            try:
                await self._http.post(
                    f"{self.rust_url}/cancel",
                    headers=self.headers,
                    timeout=2.0
                )
            except Exception as e:
                logger.error(f"Failed to notify Rust server of cancellation: {e}")
            raise
            
        except httpx.HTTPError as e:
            logger.error(f"❌ Stream {stream_id} HTTP error: {e}")
            raise AgentError(f"Stream failed: {e}") from e
        
        finally:
            async with self._stream_lock:
                self._active_streams.discard(stream_id)
            logger.info(f"🔴 Stream {stream_id} cleaned up")

    async def cancel_all(self) -> Dict[str, Any]:
        try:
            self._cancel_event.set()
            
            async with self._stream_lock:
                active_count = len(self._active_streams)
            
            try:
                response = await self._http.post(
                    f"{self.rust_url}/cancel",
                    headers=self.headers,
                    timeout=5.0
                )
                response.raise_for_status()
                result = response.json()
            except httpx.HTTPError as e:
                logger.error(f"❌ Failed to send cancel signal to Rust: {e}")
                result = {"status": "partial", "error": str(e)}
            
            await asyncio.sleep(0.5)
            self._cancel_event.clear()
            
            return {
                "status": "cancelled",
                "cancelled": active_count,
                "rust_response": result
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to cancel operations: {e}")
            self._cancel_event.clear()
            raise AgentError(f"Cancel failed: {e}") from e

    async def close(self) -> None:
        await self._http.aclose()
        
    @property
    def is_loaded(self) -> bool:
        return self._is_loaded
    
    @property
    def acceleration_type(self) -> Optional[AccelerationType]:
        return self._acceleration_type
    
    @property
    def gpu_layers(self) -> int:
        return self._gpu_layers

    @property
    def active_stream_count(self) -> int:
        return len(self._active_streams)