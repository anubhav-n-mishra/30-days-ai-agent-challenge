
import os
import httpx
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
import assemblyai as aai
import google.generativeai as genai
from datetime import datetime
import uuid
from typing import List, Dict, Any
import json
import sqlite3
from contextlib import contextmanager

# Day 8: LLM Query Models
class LLMQueryRequest(BaseModel):
    text: str
    model: str = "gemini-1.5-flash"

class LLMQueryResponse(BaseModel):
    success: bool
    response: str = None
    message: str = None

# Day 10: Chat Models
class ChatResponse(BaseModel):
    success: bool
    response: str = None
    transcription: str = None
    audio_url: str = None
    message: str = None
    session_id: str = None
    chat_history: List[Dict[str, Any]] = []
from typing import List, Dict, Any
import json

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path=dotenv_path)
print(f"DEBUG: Loading .env from: {dotenv_path}")
print(f"DEBUG: .env file exists: {os.path.exists(dotenv_path)}")

# SQLite Database Setup
DATABASE_FILE = "chat_history.db"

def init_database():
    """Initialize SQLite database with chat history table"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_session_id ON chat_messages(session_id)
    ''')
    
    conn.commit()
    conn.close()

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row  # Enable dict-like access
    try:
        yield conn
    finally:
        conn.close()

# Initialize database
init_database()

# In-memory chat history storage (backup/fallback)
chat_history_store: Dict[str, List[Dict[str, Any]]] = {}

# Day 11: Error Handling and Fallback Responses (canonical map)
FALLBACK_RESPONSES = {
    "stt": "I'm having trouble understanding your speech. Could you please try again?",
    "llm": "I'm having trouble thinking right now. Please try again in a moment.",
    "tts": "I can understand you, but I'm having trouble speaking back. Here's my text response instead.",
    "api_key": "I'm having trouble connecting right now. My services aren't configured.",
    "network": "I'm having trouble connecting right now. Please try again shortly.",
    "timeout": "That took too long. Let's try again.",
    "general": "I'm experiencing technical difficulties. Please try again."
}

def get_fallback_response(error_type: str = "general") -> str:
    return FALLBACK_RESPONSES.get(error_type, FALLBACK_RESPONSES["general"])

def create_error_response(
    error_type: str,
    message: str,
    session_id: str = None,
    transcription: str = None,
    response_override: str | None = None
) -> ChatResponse:
    """Create standardized error response with fallback and store to history if possible."""
    fallback_text = response_override or get_fallback_response(error_type)
    if session_id:
        try:
            if transcription:
                add_to_chat_history(session_id, "user", transcription)
            add_to_chat_history(session_id, "assistant", fallback_text)
        except Exception as e:
            print(f"Failed to store error response in chat history: {e}")
    return ChatResponse(
        success=False,
        response=fallback_text,
        transcription=transcription or "[Error occurred during processing]",
        audio_url=None,
        message=f"{error_type.upper()} Error: {message}",
        session_id=session_id,
        chat_history=get_chat_history(session_id) if session_id else []
    )

# Error simulation flags (env-driven)
def _env_bool(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return str(val).strip().lower() in {"1", "true", "yes", "y", "on"}

SIMULATE_STT_ERROR = _env_bool("SIMULATE_STT_ERROR", False)
SIMULATE_LLM_ERROR = _env_bool("SIMULATE_LLM_ERROR", False)
SIMULATE_TTS_ERROR = _env_bool("SIMULATE_TTS_ERROR", False)
SIMULATE_NETWORK_ERROR = _env_bool("SIMULATE_NETWORK_ERROR", False)

# AssemblyAI Configuration
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
print(f"DEBUG: ASSEMBLYAI_API_KEY = {'*' * 8 + ASSEMBLYAI_API_KEY[-8:] if ASSEMBLYAI_API_KEY else 'None'}")
if ASSEMBLYAI_API_KEY:
    aai.settings.api_key = ASSEMBLYAI_API_KEY

# Google Gemini Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print(f"DEBUG: GEMINI_API_KEY = {'*' * 8 + GEMINI_API_KEY[-8:] if GEMINI_API_KEY else 'None'}")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Murf TTS Configuration
MURF_API_KEY = os.getenv("MURF_API_KEY")
MURF_BASE_URL = os.getenv("MURF_BASE_URL", "https://api.murf.ai/v1")
print(f"DEBUG: MURF_API_KEY = {'*' * 8 + MURF_API_KEY[-8:] if MURF_API_KEY else 'None'}")

async def generate_fallback_audio(text: str) -> str:
    """Generate fallback audio using backup method or return None"""
    try:
        # Try to generate a simple fallback audio
        # This could be a basic TTS service or pre-recorded audio
        return None  # For now, return None to indicate no audio fallback
    except Exception:
        return None
def get_chat_history(session_id: str) -> List[Dict[str, Any]]:
    """Get chat history for a session from database"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT role, content, timestamp 
                FROM chat_messages 
                WHERE session_id = ? 
                ORDER BY timestamp ASC
            ''', (session_id,))
            
            rows = cursor.fetchall()
            return [
                {
                    "role": row["role"],
                    "content": row["content"],
                    "timestamp": row["timestamp"]
                }
                for row in rows
            ]
    except Exception as e:
        print(f"Database error in get_chat_history: {e}")
        # Fallback to in-memory storage
        return chat_history_store.get(session_id, [])

def add_to_chat_history(session_id: str, role: str, content: str):
    """Add message to chat history in database"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO chat_messages (session_id, role, content)
                VALUES (?, ?, ?)
            ''', (session_id, role, content))
            conn.commit()
    except Exception as e:
        print(f"Database error in add_to_chat_history: {e}")
        # Fallback to in-memory storage
        if session_id not in chat_history_store:
            chat_history_store[session_id] = []
        
        chat_history_store[session_id].append({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        })

def format_chat_history_for_llm(history: List[Dict[str, Any]]) -> str:
    """Format chat history for LLM context"""
    if not history:
        return ""
    
    formatted = "Previous conversation:\n"
    for msg in history[-10:]:  # Last 10 messages to avoid token limits
        role = "Human" if msg["role"] == "user" else "Assistant"
        formatted += f"{role}: {msg['content']}\n"
    
    formatted += "\nCurrent question: "
    return formatted

app = FastAPI(
    title="30 Days of Voice Agents - Day 11",
    description="Robust Conversational Voice Agent with Comprehensive Error Handling and Fallbacks",
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

import os
from pathlib import Path

# Get the directory of the current file
current_dir = Path(__file__).parent
frontend_dir = current_dir.parent / "frontend"

app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

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
    audio_url: str = None  # Day 9: Audio response from TTS
    transcription: str = None  # Day 9: Original transcription

MURF_API_KEY = os.getenv("MURF_API_KEY")
MURF_BASE_URL = os.getenv("MURF_BASE_URL", "https://api.murf.ai/v1")

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

@app.get("/")
def read_index():
    frontend_dir = Path(__file__).parent.parent / "frontend"
    return FileResponse(str(frontend_dir / "index.html"))

@app.get("/demo")
def error_demo():
    """Day 11: Error handling demonstration page"""
    frontend_dir = Path(__file__).parent.parent / "frontend"
    return FileResponse(str(frontend_dir / "error-demo.html"))

@app.get("/voice-generation")
def voice_generation_page():
    frontend_dir = Path(__file__).parent.parent / "frontend"
    return FileResponse(str(frontend_dir / "voice-generation.html"))

@app.get("/nav")
def navigation_helper():
    """Quick navigation helper with links to all endpoints"""
    return {
        "message": "30 Days of Voice Agents - Day 9 Navigation",
        "links": {
            "frontend": "http://localhost:8000/",
            "api_docs": "http://localhost:8000/docs",
            "health_check": "http://localhost:8000/health",
            "available_voices": "http://localhost:8000/tts/voices",
            "test_tts": "POST http://localhost:8000/tts/generate",
            "upload_audio": "POST http://localhost:8000/upload-audio",
            "transcribe_audio": "POST http://localhost:8000/transcribe/file",
            "echo_bot_v2": "POST http://localhost:8000/tts/echo",
            "llm_query": "POST http://localhost:8000/llm/query",
            "llm_audio_pipeline": "POST http://localhost:8000/llm/query/audio"
        },
        "quick_test": {
            "description": "Test TTS API with curl",
            "command": 'curl -X POST "http://localhost:8000/tts/generate" -H "Content-Type: application/json" -d \'{"text": "Hello from Day 9!", "voice_id": "en-US-ken"}\''
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
        },
        "llm_audio_pipeline_test": {
            "description": "Test Day 9 Audio-to-LLM-to-Speech Pipeline",
            "command": 'curl -X POST "http://localhost:8000/llm/query/audio" -F "file=@your_audio_question.webm"'
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

# --- Day 9: Audio-to-LLM-to-Speech Pipeline ---
@app.post("/llm/query/audio", response_model=LLMQueryResponse)
async def query_llm_with_audio(file: UploadFile = File(...), model: str = "gemini-1.5-flash"):
    """
    Day 9: Full Non-Streaming Pipeline - Audio to LLM to Speech
    
    This endpoint implements the complete pipeline:
    1. Accepts audio file as input
    2. Transcribes audio using AssemblyAI
    3. Sends transcription to Google Gemini LLM
    4. Converts LLM response to speech using Murf TTS
    5. Returns audio URL for playback
    
    - **file**: Audio file to process (WebM, MP3, WAV, etc.)
    - **model**: The Gemini model to use (default: gemini-1.5-flash)
    """
    # Check API keys
    if not ASSEMBLYAI_API_KEY:
        raise HTTPException(status_code=500, detail="ASSEMBLYAI_API_KEY not configured.")
    
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured.")
    
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
        
        user_query = transcript.text.strip()
        
        # Step 2: Query the LLM with the transcribed text
        llm_model = genai.GenerativeModel(model)
        
        # Add instruction to keep responses concise for TTS
        enhanced_prompt = f"Please provide a concise and helpful response (under 2500 characters) to: {user_query}"
        
        llm_response = llm_model.generate_content(enhanced_prompt)
        
        if not llm_response.text:
            raise HTTPException(
                status_code=500,
                detail="No response generated by the LLM. The content may have been filtered."
            )
        
        llm_text = llm_response.text.strip()
        
        # Truncate if response is too long for Murf (max 3000 characters)
        if len(llm_text) > 2800:
            llm_text = llm_text[:2800] + "..."
        
        # Step 3: Convert LLM response to speech using Murf TTS
        murf_payload = {
            "voiceId": "en-US-ken",
            "style": "Conversational", 
            "text": llm_text,
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
        async with httpx.AsyncClient(timeout=45.0) as client:
            tts_response = await client.post(
                f"{MURF_BASE_URL}/speech/generate",
                json=murf_payload,
                headers=headers
            )
            
            if tts_response.status_code == 200:
                result = tts_response.json()
                audio_url = result.get("audioFile", result.get("url", ""))
                
                if audio_url:
                    return LLMQueryResponse(
                        success=True,
                        response=llm_text,
                        transcription=user_query,
                        audio_url=audio_url,
                        message="Audio processed successfully through full pipeline",
                        model_used=model
                    )
                else:
                    raise HTTPException(status_code=500, detail="Audio URL not found in Murf API response")
            else:
                error_detail = tts_response.text
                raise HTTPException(status_code=tts_response.status_code, detail=f"Murf TTS API error: {error_detail}")
                
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Request timed out during processing")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline processing failed: {str(e)}")

# --- Day 10: Conversational Agent with Chat History ---
@app.post("/agent/chat/{session_id}", response_model=ChatResponse)
async def chat_with_agent(
    session_id: str, 
    file: UploadFile = File(...), 
    model: str = "gemini-1.5-flash",
    simulate: str = None  # Day 11: Demo error simulation via query param
):
    """
    Day 10: Conversational Agent with Chat History
    Day 11: Enhanced with comprehensive error handling and simulation
    
    Complete pipeline with memory and error resilience:
    1. Accept audio input
    2. Transcribe using AssemblyAI
    3. Retrieve chat history for session
    4. Send context + new message to LLM
    5. Store response in chat history
    6. Convert response to speech
    7. Return audio URL and chat history
    
    Error simulation modes (via ?simulate= parameter):
    - stt: Force STT failure
    - llm: Force LLM failure  
    - tts: Force TTS failure
    - network: Force network error
    """
    
    # Validate API keys (return graceful JSON instead of raising)
    if not ASSEMBLYAI_API_KEY:
        return create_error_response("api_key", "ASSEMBLYAI_API_KEY not configured.", session_id=session_id)
    if not GEMINI_API_KEY:
        return create_error_response("api_key", "GEMINI_API_KEY not configured.", session_id=session_id)
    if not MURF_API_KEY:
        # We'll still allow flow to continue without Murf by returning text-only later, so don't early-return here.
        print("WARN: MURF_API_KEY missing - TTS will be skipped and client should use fallback speech.")

    # Read audio
    audio_bytes = await file.read()
    if not audio_bytes:
        return create_error_response("stt", "No audio data received.", session_id=session_id)

    # Step 1: Transcribe audio (with simulation and robust handling)
    if get_simulation_status("stt") or simulate == 'stt':
        return create_error_response("stt", "Simulated STT error for demo", session_id=session_id)

    try:
        config = aai.TranscriptionConfig(speech_model=aai.SpeechModel.best)
        transcriber = aai.Transcriber(config=config)
        transcript = transcriber.transcribe(audio_bytes)
    except Exception as e:
        err = str(e)
        if "timeout" in err.lower():
            return create_error_response("timeout", err, session_id=session_id)
        if "network" in err.lower() or get_simulation_status("network") or simulate == 'network':
            return create_error_response("network", err or "network error", session_id=session_id)
        return create_error_response("stt", err, session_id=session_id)

    if getattr(transcript, "status", None) == "error":
        return create_error_response("stt", f"Transcription failed: {transcript.error}", session_id=session_id)
    if not transcript.text or transcript.text.strip() == "":
        return create_error_response("stt", "No speech detected.", session_id=session_id)
    user_message = transcript.text.strip()

    # Step 2: Retrieve and format chat history
    history = get_chat_history(session_id)
    if history:
        context = format_chat_history_for_llm(history)
        llm_input = f"{context}{user_message}"
    else:
        llm_input = f"You are a helpful AI assistant. Please respond naturally to this question: {user_message}"

    # Step 3: Query LLM (with simulation)
    if get_simulation_status("llm") or simulate == 'llm':
        return create_error_response("llm", "Simulated LLM error for demo", session_id=session_id, transcription=user_message)

    try:
        llm_model = genai.GenerativeModel(model)
        llm_response = llm_model.generate_content(llm_input)
        llm_text = (llm_response.text or "").strip()
        if not llm_text:
            return create_error_response("llm", "No LLM response generated.", session_id=session_id, transcription=user_message)
    except Exception as e:
        err = str(e)
        if "quota" in err.lower() or "rate" in err.lower():
            return create_error_response("general", err, session_id=session_id, transcription=user_message, response_override="I'm being rate limited right now. Please try again in a bit.")
        if "timeout" in err.lower():
            return create_error_response("timeout", err, session_id=session_id, transcription=user_message)
        if "api key" in err.lower() or "permission" in err.lower():
            return create_error_response("api_key", err, session_id=session_id, transcription=user_message)
        return create_error_response("llm", err, session_id=session_id, transcription=user_message)

    # Truncate for TTS if too long
    if len(llm_text) > 2800:
        llm_text = llm_text[:2800] + "..."

    # Step 4: Persist to history (best-effort)
    try:
        add_to_chat_history(session_id, "user", user_message)
        add_to_chat_history(session_id, "assistant", llm_text)
    except Exception as e:
        print(f"WARN: Failed to persist chat history: {e}")

    # Step 5: TTS (with simulation and graceful degradation)
    audio_url = None
    tts_skipped = False
    if not MURF_API_KEY:
        tts_skipped = True
    elif get_simulation_status("tts") or simulate == 'tts':
        tts_skipped = True
    else:
        murf_payload = {
            "voiceId": "en-US-ken",
            "style": "Conversational",
            "text": llm_text,
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
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                tts_response = await client.post(
                    f"{MURF_BASE_URL}/speech/generate",
                    json=murf_payload,
                    headers=headers
                )
                if tts_response.status_code == 200:
                    result = tts_response.json()
                    audio_url = result.get("audioFile", result.get("url", "")) or None
                else:
                    print(f"WARN: TTS failed status={tts_response.status_code} body={tts_response.text}")
        except Exception as e:
            print(f"WARN: TTS exception: {e}")

    updated_history = get_chat_history(session_id)
    # If TTS unavailable, still return text response so client can speak via Web Speech API
    return ChatResponse(
        success=True,  # LLM succeeded; conversation can continue
        response=llm_text,
        transcription=user_message,
        audio_url=audio_url,
        session_id=session_id,
        chat_history=updated_history,
        message=("TTS unavailable; using client fallback." if (tts_skipped or not audio_url) else "OK")
    )

# --- Helper endpoint to get chat history ---
@app.get("/agent/chat/{session_id}/history")
async def get_session_history(session_id: str):
    """Get chat history for a session"""
    history = get_chat_history(session_id)
    return {
        "session_id": session_id,
        "chat_history": history,
        "message_count": len(history)
    }

# --- Database status endpoint ---
@app.get("/admin/database/status")
async def get_database_status():
    """Get database status and session counts"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Get total messages
            cursor.execute("SELECT COUNT(*) as total_messages FROM chat_messages")
            total_messages = cursor.fetchone()["total_messages"]
            
            # Get session count
            cursor.execute("SELECT COUNT(DISTINCT session_id) as session_count FROM chat_messages")
            session_count = cursor.fetchone()["session_count"]
            
            # Get recent sessions
            cursor.execute("""
                SELECT session_id, COUNT(*) as message_count, MAX(timestamp) as last_activity
                FROM chat_messages 
                GROUP BY session_id 
                ORDER BY last_activity DESC 
                LIMIT 10
            """)
            recent_sessions = [dict(row) for row in cursor.fetchall()]
            
            return {
                "database_status": "connected",
                "total_messages": total_messages,
                "session_count": session_count,
                "recent_sessions": recent_sessions
            }
    except Exception as e:
        return {
            "database_status": "error",
            "error": str(e),
            "fallback": "using in-memory storage"
        }

# --- Day 11: Error simulation status endpoint ---
@app.get("/admin/error-simulation/status")
async def get_error_simulation_status():
    """Get current error simulation settings"""
    return {
        "title": "Day 11: Error Handling Demo",
        "simulation_flags": {
            "SIMULATE_STT_ERROR": SIMULATE_STT_ERROR,
            "SIMULATE_LLM_ERROR": SIMULATE_LLM_ERROR,
            "SIMULATE_TTS_ERROR": SIMULATE_TTS_ERROR,
            "SIMULATE_NETWORK_ERROR": SIMULATE_NETWORK_ERROR
        },
        "api_keys_configured": {
            "ASSEMBLYAI_API_KEY": bool(ASSEMBLYAI_API_KEY),
            "GEMINI_API_KEY": bool(GEMINI_API_KEY),
            "MURF_API_KEY": bool(MURF_API_KEY)
        },
        "fallback_responses": FALLBACK_RESPONSES,
        "demo_url": "/demo",
        "instructions": {
            "environment_simulation": "Set environment variables like SIMULATE_STT_ERROR=true",
            "query_simulation": "Use ?simulate=stt|llm|tts|network in /agent/chat/{session_id}",
            "api_key_simulation": "Comment out API keys in .env file to test missing key scenarios"
        }
    }

# Global simulation control variables (runtime toggles)
simulation_overrides = {
    "stt": None,    # None = use env var, True/False = override
    "llm": None,
    "tts": None,
    "network": None
}

def get_simulation_status(error_type: str) -> bool:
    """Get current simulation status for error type, checking overrides first"""
    override = simulation_overrides.get(error_type)
    if override is not None:
        return override
    
    # Fall back to environment variables
    if error_type == "stt":
        return SIMULATE_STT_ERROR
    elif error_type == "llm":
        return SIMULATE_LLM_ERROR
    elif error_type == "tts":
        return SIMULATE_TTS_ERROR
    elif error_type == "network":
        return SIMULATE_NETWORK_ERROR
    return False

@app.get("/admin/simulation/status")
async def get_current_simulation_status():
    """Get current simulation status including runtime overrides"""
    return {
        "stt_error": get_simulation_status("stt"),
        "llm_error": get_simulation_status("llm"),
        "tts_error": get_simulation_status("tts"),
        "network_error": get_simulation_status("network"),
        "environment_flags": {
            "SIMULATE_STT_ERROR": SIMULATE_STT_ERROR,
            "SIMULATE_LLM_ERROR": SIMULATE_LLM_ERROR,
            "SIMULATE_TTS_ERROR": SIMULATE_TTS_ERROR,
            "SIMULATE_NETWORK_ERROR": SIMULATE_NETWORK_ERROR
        },
        "runtime_overrides": simulation_overrides
    }

@app.post("/admin/simulation/{error_type}/enable")
async def enable_error_simulation(error_type: str):
    """Enable error simulation for specific type"""
    if error_type not in ["stt", "llm", "tts", "network"]:
        raise HTTPException(status_code=400, detail="Invalid error type")
    
    simulation_overrides[error_type] = True
    return {
        "success": True,
        "message": f"{error_type.upper()} error simulation enabled",
        "error_type": error_type,
        "enabled": True
    }

@app.post("/admin/simulation/{error_type}/disable")
async def disable_error_simulation(error_type: str):
    """Disable error simulation for specific type"""
    if error_type not in ["stt", "llm", "tts", "network"]:
        raise HTTPException(status_code=400, detail="Invalid error type")
    
    simulation_overrides[error_type] = False
    return {
        "success": True,
        "message": f"{error_type.upper()} error simulation disabled",
        "error_type": error_type,
        "enabled": False
    }

@app.post("/admin/simulation/reset")
async def reset_all_simulation():
    """Reset all simulation overrides to use environment variables"""
    global simulation_overrides
    simulation_overrides = {"stt": None, "llm": None, "tts": None, "network": None}
    return {
        "success": True,
        "message": "All simulation overrides reset - using environment variables",
        "overrides": simulation_overrides
    }
