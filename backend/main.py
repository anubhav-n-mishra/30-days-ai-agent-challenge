
import os
import httpx
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
import assemblyai as aai
import google.generativeai as genai

# Load environment variables
load_dotenv()

# AssemblyAI Configuration
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
if ASSEMBLYAI_API_KEY:
    aai.settings.api_key = ASSEMBLYAI_API_KEY

# Google Gemini Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(
    title="30 Days of Voice Agents - Day 8",
    description="Voice Agent API with Text-to-Speech, Audio Upload, Transcription, Echo Bot v2, and LLM Query capabilities",
    version="1.0.0"
)

# --- Day 6: Transcription Endpoint ---
@app.post("/transcribe/file")
async def transcribe_file(file: UploadFile = File(...)):
    """
    Day 6: Accepts an audio file and returns the transcription using AssemblyAI.
    
    This endpoint receives an audio file, transcribes it using AssemblyAI's best speech model,
    and returns the transcription text.
    
    - **file**: Audio file to transcribe (WebM, MP3, WAV, etc.)
    """
    if not ASSEMBLYAI_API_KEY:
        raise HTTPException(status_code=500, detail="ASSEMBLYAI_API_KEY not configured. Please add your AssemblyAI API key.")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No audio data received.")

    try:
        config = aai.TranscriptionConfig(speech_model=aai.SpeechModel.best)
        transcriber = aai.Transcriber(config=config)
        
        transcript = transcriber.transcribe(audio_bytes)
        
        if transcript.status == "error":
            raise HTTPException(status_code=500, detail=f"Transcription failed: {transcript.error}")
        
        return {
            "success": True, 
            "transcript": transcript.text,
            "message": "Audio transcribed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

# --- Day 7: Echo Bot v2 Endpoint ---
@app.post("/tts/echo")
async def echo_with_voice(file: UploadFile = File(...)):
    """
    Day 7: Echo Bot v2 - Transcribes audio and plays it back with Murf voice.
    
    This endpoint:
    1. Accepts an audio file as input
    2. Transcribes it using AssemblyAI
    3. Generates new audio with Murf TTS
    4. Returns the URL to the generated audio
    
    - **file**: Audio file to echo back with TTS voice (WebM, MP3, WAV, etc.)
    """
    # Check API keys
    if not ASSEMBLYAI_API_KEY:
        raise HTTPException(status_code=500, detail="ASSEMBLYAI_API_KEY not configured.")
    
    if not MURF_API_KEY:
        raise HTTPException(status_code=500, detail="MURF_API_KEY not configured.")

    # Read audio file
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="No audio data received.")

    try:
        # Step 1: Transcribe the audio using AssemblyAI
        config = aai.TranscriptionConfig(speech_model=aai.SpeechModel.best)
        transcriber = aai.Transcriber(config=config)
        
        transcript = transcriber.transcribe(audio_bytes)
        
        if transcript.status == "error":
            raise HTTPException(status_code=500, detail=f"Transcription failed: {transcript.error}")
        
        if not transcript.text or transcript.text.strip() == "":
            raise HTTPException(status_code=400, detail="No speech detected in the audio file.")
        
        # Step 2: Generate TTS audio using Murf API
        murf_payload = {
            "voiceId": "en-US-ken",  # You can change this to any Murf voice
            "style": "Conversational",
            "text": transcript.text,
            "rate": "0",
            "pitch": "0", 
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
            tts_response = await client.post(
                f"{MURF_BASE_URL}/speech/generate",
                json=murf_payload,
                headers=headers
            )
            
            if tts_response.status_code == 200:
                result = tts_response.json()
                audio_url = result.get("audioFile", result.get("url", ""))
                
                if audio_url:
                    return {
                        "success": True,
                        "audio_url": audio_url,
                        "transcript": transcript.text,
                        "message": "Echo audio generated successfully with Murf voice"
                    }
                else:
                    raise HTTPException(status_code=500, detail="Audio URL not found in Murf API response")
            else:
                error_detail = tts_response.text
                raise HTTPException(status_code=tts_response.status_code, detail=f"Murf API error: {error_detail}")
                
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Request timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Echo processing failed: {str(e)}")

# Serve static frontend files

app.mount("/static", StaticFiles(directory="frontend"), name="static")

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

class AudioUploadResponse(BaseModel):
    success: bool
    message: str
    filename: str = None
    content_type: str = None
    size: int = None

# Day 8: LLM Query Models
class LLMQueryRequest(BaseModel):
    text: str
    model: str = "gemini-1.5-flash"  # Default Gemini model

class LLMQueryResponse(BaseModel):
    success: bool
    response: str = None
    message: str = None
    model_used: str = None

MURF_API_KEY = os.getenv("MURF_API_KEY")
MURF_BASE_URL = os.getenv("MURF_BASE_URL", "https://api.murf.ai/v1")

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

@app.get("/")
def read_index():
    return FileResponse("frontend/index.html")

@app.get("/voice-generation")
def voice_generation_page():
    return FileResponse("frontend/voice-generation.html")

@app.get("/nav")
def navigation_helper():
    """Quick navigation helper with links to all endpoints"""
    return {
        "message": "30 Days of Voice Agents - Day 8 Navigation",
        "links": {
            "frontend": "http://localhost:8000/",
            "api_docs": "http://localhost:8000/docs",
            "health_check": "http://localhost:8000/health",
            "available_voices": "http://localhost:8000/tts/voices",
            "test_tts": "POST http://localhost:8000/tts/generate",
            "upload_audio": "POST http://localhost:8000/upload-audio",
            "transcribe_audio": "POST http://localhost:8000/transcribe/file",
            "echo_bot_v2": "POST http://localhost:8000/tts/echo",
            "llm_query": "POST http://localhost:8000/llm/query"
        },
        "quick_test": {
            "description": "Test TTS API with curl",
            "command": 'curl -X POST "http://localhost:8000/tts/generate" -H "Content-Type: application/json" -d \'{"text": "Hello from Day 8!", "voice_id": "en-US-ken"}\''
        },
        "audio_upload_test": {
            "description": "Test audio upload with curl",
            "command": 'curl -X POST "http://localhost:8000/upload-audio" -F "file=@your_audio_file.webm"'
        },
        "transcription_test": {
            "description": "Test audio transcription with curl",
            "command": 'curl -X POST "http://localhost:8000/transcribe/file" -F "file=@your_audio_file.webm"'
        },
        "echo_v2_test": {
            "description": "Test Echo Bot v2 with curl",
            "command": 'curl -X POST "http://localhost:8000/tts/echo" -F "file=@your_audio_file.webm"'
        },
        "llm_query_test": {
            "description": "Test LLM Query with curl",
            "command": 'curl -X POST "http://localhost:8000/llm/query" -H "Content-Type: application/json" -d \'{"text": "What is artificial intelligence?"}\''
        }
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Voice Agent API"}

@app.post("/upload-audio", response_model=AudioUploadResponse)
async def upload_audio(file: UploadFile = File(...)):
    """
    Upload audio file endpoint for Day 5: Send Audio to the Server
    
    This endpoint receives an audio file, saves it temporarily to /uploads folder,
    and returns the name, content type, and size of the audio file as response.
    
    - **file**: Audio file to upload (WebM, MP3, WAV, etc.)
    """
    
    try:
        allowed_types = [
            "audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", 
            "audio/ogg", "audio/opus", "audio/x-wav"
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. Allowed types: {', '.join(allowed_types)}"
            )
        import time
        timestamp = int(time.time())
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ".webm"
        unique_filename = f"audio_{timestamp}_{file.filename if file.filename else 'recording.webm'}"
        file_path = os.path.join(UPLOADS_DIR, unique_filename)
        
        contents = await file.read()
        file_size = len(contents)
        with open(file_path, "wb") as f:
            f.write(contents)
        
        return AudioUploadResponse(
            success=True,
            message="Audio file uploaded successfully",
            filename=unique_filename,
            content_type=file.content_type,
            size=file_size
        )
        
    except HTTPException:
        raise 
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload audio file: {str(e)}"
        )

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

# --- Day 8: LLM Query Endpoint ---
@app.post("/llm/query", response_model=LLMQueryResponse)
async def query_llm(request: LLMQueryRequest):
    """
    Day 8: Query a Large Language Model (Google Gemini) with text input.
    
    This endpoint:
    1. Accepts text input from the user
    2. Sends the text to Google's Gemini API
    3. Returns the LLM's response
    
    - **text**: The text query/prompt to send to the LLM
    - **model**: The Gemini model to use (default: gemini-1.5-flash)
    """
    # Check if Gemini API key is configured
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="GEMINI_API_KEY not configured. Please set your Gemini API key in the .env file."
        )
    
    # Validate input
    if not request.text or request.text.strip() == "":
        raise HTTPException(
            status_code=400,
            detail="Text input is required and cannot be empty."
        )
    
    try:
        # Initialize the Gemini model
        model = genai.GenerativeModel(request.model)
        
        # Generate response from Gemini
        response = model.generate_content(request.text)
        
        # Check if the response was successful
        if not response.text:
            raise HTTPException(
                status_code=500,
                detail="No response generated by the LLM. The content may have been filtered."
            )
        
        return LLMQueryResponse(
            success=True,
            response=response.text,
            message="LLM query completed successfully",
            model_used=request.model
        )
        
    except Exception as e:
        # Handle various types of errors
        error_message = str(e)
        
        if "API_KEY" in error_message.upper():
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired Gemini API key. Please check your API key configuration."
            )
        elif "QUOTA" in error_message.upper() or "LIMIT" in error_message.upper():
            raise HTTPException(
                status_code=429,
                detail="API quota exceeded. Please try again later or check your Gemini API usage limits."
            )
        elif "SAFETY" in error_message.upper() or "BLOCKED" in error_message.upper():
            raise HTTPException(
                status_code=400,
                detail="Content was blocked by safety filters. Please modify your query and try again."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"LLM query failed: {error_message}"
            )
