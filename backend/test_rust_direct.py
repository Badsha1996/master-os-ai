"""
Debug script to test the streaming pipeline
Run this to see what's happening at each stage
"""
import asyncio
import httpx
import json

async def test_rust_direct():
    """Test Rust server directly"""
    print("=" * 60)
    print("TEST 1: Direct Rust Server Test")
    print("=" * 60)
    
    url = "http://127.0.0.1:5005/predict/stream"
    
    payload = {
        "prompt": "[INST] <<SYS>>\nYou must always respond in this format:\n<thinking>your reasoning</thinking>\nYour response.\n<</SYS>>\n\nUser: Say hello [/INST]",
        "max_tokens": 100,
        "temperature": 0.7,
        "stop": ["</s>"]
    }
    
    print(f"\nSending to Rust: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}\n")
    
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", url, json=payload) as response:
            print(f"Response status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"ERROR: {await response.aread()}")
                return
            
            print("\n--- STREAMING TOKENS ---")
            token_count = 0
            full_text = ""
            
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    data_str = line[5:].strip()
                    if data_str:
                        try:
                            data = json.loads(data_str)
                            token = data.get("text", "")
                            if token:
                                token_count += 1
                                full_text += token
                                print(f"Token {token_count}: '{token}'")
                        except json.JSONDecodeError as e:
                            print(f"JSON Error: {e}")
                            print(f"Raw data: {data_str}")
            
            print("\n--- FINAL OUTPUT ---")
            print(f"Total tokens: {token_count}")
            print(f"Full text:\n{full_text}")


async def test_python_layer():
    """Test through Python FastAPI"""
    print("\n" + "=" * 60)
    print("TEST 2: Python FastAPI Layer Test")
    print("=" * 60)
    
    url = "http://127.0.0.1:8000/api/chat/stream"
    
    payload = {
        "text": "Say hello",
        "temperature": 0.7,
        "max_tokens": 100
    }
    
    print(f"\nSending to Python: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}\n")
    
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST", 
            url, 
            json=payload,
            headers={"x-token": "54321"}
        ) as response:
            print(f"Response status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"ERROR: {await response.aread()}")
                return
            
            print("\n--- STREAMING EVENTS ---")
            event_count = 0
            
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    data_str = line[5:].strip()
                    if data_str:
                        try:
                            event = json.loads(data_str)
                            event_count += 1
                            event_type = event.get("type", "unknown")
                            print(f"\nEvent {event_count} [{event_type}]:")
                            print(f"  {json.dumps(event, indent=2)}")
                        except json.JSONDecodeError as e:
                            print(f"JSON Error: {e}")
                            print(f"Raw data: {data_str}")
            
            print(f"\nTotal events received: {event_count}")


async def main():
    print("\n🔍 Master-OS Streaming Debug Tool\n")
    
    # Test 1: Direct Rust
    try:
        await test_rust_direct()
    except Exception as e:
        print(f"\n❌ Rust test failed: {e}")
    
    await asyncio.sleep(2)
    
    # Test 2: Python layer
    try:
        await test_python_layer()
    except Exception as e:
        print(f"\n❌ Python test failed: {e}")
    
    print("\n" + "=" * 60)
    print("Debug test complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())