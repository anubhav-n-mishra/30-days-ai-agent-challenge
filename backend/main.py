import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="30 Days of Voice Agents - Day 2",
    description="Voice Agent API with Text-to-Speech functionality using Murf API",
    version="1.0.0"
)

# Serve static frontend files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# Pydantic models for request/response
class TTSRequest(BaseModel):
    text: str
    voice_id: str = "en-US-ken"  # Default voice
    rate: str = "0"  # Default speech rate
    pitch: str = "0"  # Default pitch
    
class TTSResponse(BaseModel):
    success: bool
    audio_url: str = None
    message: str = None

# Configuration
MURF_API_KEY = os.getenv("MURF_API_KEY")
MURF_BASE_URL = os.getenv("MURF_BASE_URL", "https://api.murf.ai/v1")

@app.get("/")
def read_index():
    return FileResponse("../frontend/index.html")

@app.get("/voice-generation")
def voice_generation_page():
    return FileResponse("../frontend/voice-generation.html")

@app.get("/nav")
def navigation_helper():
    """Quick navigation helper with links to all endpoints"""
    return {
        "message": "30 Days of Voice Agents - Day 2 Navigation",
        "links": {
            "frontend": "http://localhost:8000/",
            "api_docs": "http://localhost:8000/docs",
            "health_check": "http://localhost:8000/health",
            "available_voices": "http://localhost:8000/tts/voices",
            "test_tts": "POST http://localhost:8000/tts/generate"
        },
        "quick_test": {
            "description": "Test TTS API with curl",
            "command": 'curl -X POST "http://localhost:8000/tts/generate" -H "Content-Type: application/json" -d \'{"text": "Hello from Day 2!", "voice_id": "en-US-ken"}\''
        }
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Voice Agent API"}

@app.post("/tts/generate", response_model=TTSResponse)
async def generate_speech(request: TTSRequest):
    """
    Generate speech from text using Murf's TTS API
    
    - **text**: The text to convert to speech
    - **voice_id**: Voice ID to use (default: en-US-ken)
    - **rate**: Speech rate (-10 to 10, default: 0)
    - **pitch**: Speech pitch (-10 to 10, default: 0)
    """
    
    if not MURF_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="MURF_API_KEY not configured. Please add your Murf API key to .env file"
        )
    
    if not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty"
        )
    
    try:
        # Prepare the request to Murf API
        murf_payload = {
            "voiceId": request.voice_id,
            "style": "Conversational",
            "text": request.text,
            "rate": request.rate,
            "pitch": request.pitch,
            "sampleRate": 48000,
            "format": "MP3",
            "channelType": "STEREO",
            "pronunciationDictionary": {},
            "encodeAsBase64": False
        }
        
        headers = {
            "api-key": MURF_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Make the API call to Murf
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{MURF_BASE_URL}/speech/generate",
                json=murf_payload,
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                # Extract the audio URL from Murf's response
                audio_url = result.get("audioFile", result.get("url", ""))
                
                if audio_url:
                    return TTSResponse(
                        success=True,
                        audio_url=audio_url,
                        message="Speech generated successfully"
                    )
                else:
                    raise HTTPException(
                        status_code=500,
                        detail="Audio URL not found in Murf API response"
                    )
            else:
                error_detail = response.text
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Murf API error: {error_detail}"
                )
                
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=408,
            detail="Request to Murf API timed out"
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Network error while calling Murf API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@app.get("/tts/voices")
async def get_available_voices():
    """
    Get list of available voices from Murf API
    """
    if not MURF_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="MURF_API_KEY not configured"
        )
    
    try:
        headers = {
            "api-key": MURF_API_KEY,
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{MURF_BASE_URL}/speech/voices",
                headers=headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch voices: {response.text}"
                )
                
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching voices: {str(e)}"
        )
