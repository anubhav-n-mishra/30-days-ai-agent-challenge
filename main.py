import os
from dotenv import load_dotenv
import logging
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path as PathLib
import json
import asyncio
import config
from typing import Type, List
import base64
import websockets
from datetime import datetime
import re
from tavily import TavilyClient
from supabase import create_client, Client

import assemblyai as aai
from assemblyai.streaming.v3 import (
    BeginEvent,
    StreamingClient,
    StreamingClientOptions,
    StreamingError,
    StreamingEvents,
    StreamingParameters,
    TerminationEvent,
    TurnEvent,
)
import google.generativeai as genai

# Global variables to store user API keys
user_api_keys = {}

# Initialize Supabase client
supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
app = FastAPI()

BASE_DIR = PathLib(__file__).resolve().parent
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Initialize clients with user API keys (will be set when user provides keys)
tavily_client = None
gemini_model = None

def initialize_clients_with_keys(api_keys):
    """Initialize API clients with user-provided keys"""
    global tavily_client, gemini_model
    
    logging.info("Initializing AI clients with user API keys...")
    
    # Initialize Tavily client
    if api_keys.get('tavily'):
        try:
            tavily_client = TavilyClient(api_key=api_keys['tavily'])
            logging.info("✅ Tavily client initialized with user API key.")
        except Exception as e:
            logging.warning(f"Failed to initialize Tavily client: {e}")
    else:
        logging.info("No Tavily API key provided - web search will be disabled")
    
    # Initialize Gemini model
    if api_keys.get('gemini'):
        try:
            logging.info("Configuring Gemini API...")
            genai.configure(api_key=api_keys['gemini'])
            
            # Initialize simple Gemini model first
            gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            logging.info("✅ Gemini model initialized with user API key.")
        except Exception as e:
            logging.error(f"Failed to initialize Gemini model: {e}")
            raise e
    else:
        logging.error("No Gemini API key provided!")
        raise ValueError("Gemini API key is required")

# Define search function for Gemini function calling
def search_web(query: str) -> str:
    """Search the web for current information using Tavily API"""
    if not tavily_client:
        return "I apologize, but my intelligence network is temporarily offline. However, I can still assist you with other matters using my vast knowledge and strategic insights."
    
    try:
        response = tavily_client.search(query=query, max_results=3)
        results = []
        for result in response.get('results', []):
            title = result.get('title', 'No title')
            content = result.get('content', 'No content')[:300]  # Limit content length
            url = result.get('url', 'No URL')
            results.append(f"Title: {title}\nContent: {content}...\nSource: {url}")
        
        if results:
            return "According to my intelligence network, here's what I found:\n\n" + "\n\n".join(results)
        else:
            return "My intelligence sources couldn't find relevant information for that query at this time."
    except Exception as e:
        logging.error(f"Web search error: {e}")
        return "I encountered an issue accessing my intelligence network. My strategic database remains at your service for other inquiries."

# Gemini model will be initialized when user provides API keys


async def get_llm_response_stream(transcript: str, client_websocket: WebSocket, chat_history: List[dict]):
    global user_api_keys, gemini_model
    
    if not transcript or not transcript.strip():
        return

    if not gemini_model:
        logging.error("Cannot get LLM response because Gemini model is not initialized.")
        await client_websocket.send_text(json.dumps({"type": "llm_chunk", "data": "I apologize, but my AI model is not properly initialized. Please check your API keys."}))
        return

    logging.info(f"Sending to Gemini with history: '{transcript}'")
    logging.info(f"Gemini model status: {gemini_model is not None}")
    logging.info(f"User API keys available: {list(user_api_keys.keys()) if user_api_keys else 'None'}")
    
    murf_api_key = user_api_keys.get('murf', '')
    if not murf_api_key:
        logging.error("Murf API key not provided")
        await client_websocket.send_text(json.dumps({"type": "llm_chunk", "data": "I apologize, but the text-to-speech service is not configured properly."}))
        return
    
    murf_uri = f"wss://api.murf.ai/v1/speech/stream-input?api-key={murf_api_key}&sample_rate=44100&channel_type=MONO&format=MP3"

    # Enhanced Lelouch persona with web search capability
    voice_id = "en-US-william"
    persona_prompt = (
        "You are Lelouch vi Britannia, the exiled prince and brilliant strategist from Code Geass. "
        "You have access to a search_web function for current information. "
        "For questions about current events, weather, news, recent developments, or real-time information, "
        "you MUST call the search_web function first to get accurate data. "
        "Present search results as your 'strategic intelligence network' findings. "
        "Use formal language and strategic thinking in your responses. "
        f"User question: '{transcript}'"
    )
    tts_hints = {"pace": 0.92, "energy": 0.6, "pitch": -0.03}

    logging.info("Using enhanced Lelouch persona with web search capability")
    logging.info(f"Voice: {voice_id}, TTS hints: {tts_hints}")

    try:
        async with websockets.connect(murf_uri) as websocket:
            logging.info(f"Successfully connected to Murf AI, using voice: {voice_id}")
            context_id = f"voice-agent-context-{datetime.now().isoformat()}"
            config_msg = {
                "voice_config": {"voiceId": voice_id, "style": "Conversational", **tts_hints},
                "context_id": context_id
            }
            await websocket.send(json.dumps(config_msg))

            async def receive_and_forward_audio():
                first_audio_chunk_received = False
                while True:
                    try:
                        response_str = await websocket.recv()
                        response = json.loads(response_str)

                        if "audio" in response and response['audio']:
                            if not first_audio_chunk_received:
                                await client_websocket.send_text(json.dumps({"type": "audio_start"}))
                                first_audio_chunk_received = True
                                logging.info("✅ Streaming first audio chunk to client.")

                            base_64_chunk = response['audio']
                            await client_websocket.send_text(
                                json.dumps({"type": "audio", "data": base_64_chunk})
                            )

                        if response.get("final"):
                            logging.info("Murf confirms final audio chunk received. Sending audio_end to client.")
                            await client_websocket.send_text(json.dumps({"type": "audio_end"}))
                            break
                    except websockets.ConnectionClosed:
                        logging.warning("Murf connection closed unexpectedly.")
                        await client_websocket.send_text(json.dumps({"type": "audio_end"}))
                        break
                    except Exception as e:
                        logging.error(f"Error in Murf receiver task: {e}")
                        break
            receiver_task = asyncio.create_task(receive_and_forward_audio())

            try:
                chat_history.append({"role": "user", "parts": [persona_prompt]})
                chat = gemini_model.start_chat(history=chat_history[:-1])

                def generate_with_function_calling():
                    try:
                        logging.info("Starting Gemini response generation...")
                        response = chat.send_message(persona_prompt, stream=True)
                        return response
                    except Exception as e:
                        logging.error(f"Error in generation: {e}")
                        return chat.send_message(persona_prompt, stream=True)

                loop = asyncio.get_running_loop()
                gemini_response_stream = await loop.run_in_executor(None, generate_with_function_calling)

                sentence_buffer = ""
                full_response_text = ""
                print("\n--- LELOUCH AI (GEMINI) STREAMING RESPONSE ---")
                
                # Handle both streaming and non-streaming responses
                try:
                    # For streaming responses, iterate directly
                    sentence_buffer = ""
                    full_response_text = ""
                    
                    for chunk in gemini_response_stream:
                        if chunk.text:
                            print(chunk.text, end="", flush=True)
                            full_response_text += chunk.text

                            await client_websocket.send_text(
                                json.dumps({"type": "llm_chunk", "data": chunk.text})
                            )
                            
                            sentence_buffer += chunk.text
                            sentences = re.split(r'(?<=[.?!])\s+', sentence_buffer)
                            
                            if len(sentences) > 1:
                                for sentence in sentences[:-1]:
                                    if sentence.strip():
                                        text_msg = {
                                            "text": sentence.strip(), 
                                            "end": False,
                                            "context_id": context_id
                                        }
                                        await websocket.send(json.dumps(text_msg))
                                sentence_buffer = sentences[-1]

                    if sentence_buffer.strip():
                        text_msg = {
                            "text": sentence_buffer.strip(), 
                            "end": True,
                            "context_id": context_id
                        }
                        await websocket.send(json.dumps(text_msg))
                        
                except Exception as streaming_error:
                    logging.error(f"❌ Streaming error: {streaming_error}")
                    # Fallback: try to get the text directly
                    try:
                        response_text = gemini_response_stream.text if hasattr(gemini_response_stream, 'text') else "I apologize, but I encountered an issue processing that request."
                        print(response_text)
                        full_response_text = response_text
                        
                        await client_websocket.send_text(
                            json.dumps({"type": "llm_chunk", "data": response_text})
                        )
                        
                        text_msg = {
                            "text": response_text.strip(), 
                            "end": True,
                            "context_id": context_id
                        }
                        await websocket.send(json.dumps(text_msg))
                    except Exception as fallback_error:
                        logging.error(f"❌ Fallback error: {fallback_error}")
                        error_text = "I apologize, but I encountered an issue processing that request."
                        full_response_text = error_text
                        
                        await client_websocket.send_text(
                            json.dumps({"type": "llm_chunk", "data": error_text})
                        )
                        
                        text_msg = {
                            "text": error_text, 
                            "end": True,
                            "context_id": context_id
                        }
                        await websocket.send(json.dumps(text_msg))
                
                chat_history.append({"role": "model", "parts": [full_response_text]})

                print("\n--- END OF LELOUCH AI (GEMINI) STREAM ---\n")
                logging.info("Finished streaming to Murf. Waiting for final audio chunks...")

                await asyncio.wait_for(receiver_task, timeout=60.0)
                logging.info("Receiver task finished gracefully.")
            
            finally:
                if not receiver_task.done():
                    receiver_task.cancel()
                    logging.info("Receiver task cancelled on exit.")

    except asyncio.CancelledError:
        logging.info("LLM/TTS task was cancelled by user interruption.")
        await client_websocket.send_text(json.dumps({"type": "audio_interrupt"}))
    except Exception as e:
        logging.error(f"Error in LLM/TTS streaming function: {e}", exc_info=True)


@app.get("/auth")
async def auth_page(request: Request):
    return templates.TemplateResponse("auth.html", {
        "request": request,
        "supabase_url": config.SUPABASE_URL,
        "supabase_key": config.SUPABASE_ANON_KEY
    })

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})



@app.post("/api/save-chat")
async def save_chat(request: Request):
    data = await request.json()
    user_id = data.get('user_id')
    chat_data = data.get('chat_data')
    
    if not user_id or not chat_data:
        raise HTTPException(status_code=400, detail="Missing user_id or chat_data")
    
    try:
        logging.info(f"Attempting to save chat for user: {user_id}")
        result = supabase.table('chat_history').insert({
            'user_id': user_id,
            'chat_data': chat_data
        }).execute()
        logging.info(f"Supabase result: {result}")
        
        if result.data:
            return {"success": True, "id": result.data[0]['id']}
        else:
            logging.error(f"No data returned from Supabase")
            return {"success": False, "message": "Failed to save to database"}
    except Exception as e:
        logging.error(f"Supabase save error: {e}")
        return {"success": False, "message": f"Database error: {str(e)}"}

@app.get("/api/chat-history/{user_id}")
async def get_chat_history(user_id: str):
    try:
        result = supabase.table('chat_history').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        logging.error(f"Chat history error: {e}")
        return {"success": True, "data": []}

@app.delete("/api/delete-chat/{chat_id}")
async def delete_chat(chat_id: int):
    try:
        result = supabase.table('chat_history').delete().eq('id', chat_id).execute()
        return {"success": True}
    except Exception as e:
        logging.error(f"Delete chat error: {e}")
        return {"success": False, "message": str(e)}

async def send_client_message(ws: WebSocket, message: dict):
    try:
        await ws.send_text(json.dumps(message))
    except ConnectionError:
        logging.warning("Client connection closed, could not send message.")

@app.websocket("/ws")
async def websocket_audio_streaming(websocket: WebSocket):
    await websocket.accept()
    logging.info("WebSocket connection accepted.")
    main_loop = asyncio.get_running_loop()
    
    llm_task = None
    last_processed_transcript = ""
    chat_history = []
    client = None
    
    # Wait for API keys from client
    await send_client_message(websocket, {"type": "status", "message": "Waiting for API keys..."})

    def on_turn(self: Type[StreamingClient], event: TurnEvent):
        nonlocal last_processed_transcript, llm_task
        transcript_text = event.transcript.strip()
        
        if event.end_of_turn and event.turn_is_formatted and transcript_text and transcript_text != last_processed_transcript:
            last_processed_transcript = transcript_text
            
            if llm_task and not llm_task.done():
                logging.warning("User interrupted while previous response was generating. Cancelling task.")
                llm_task.cancel()
                asyncio.run_coroutine_threadsafe(
                    send_client_message(websocket, {"type": "audio_interrupt"}), main_loop
                )
            
            logging.info(f"Final formatted turn: '{transcript_text}'")
            
            transcript_message = { "type": "transcription", "text": transcript_text, "end_of_turn": True }
            asyncio.run_coroutine_threadsafe(send_client_message(websocket, transcript_message), main_loop)
            
            logging.info("Starting LLM response generation...")
            llm_task = asyncio.run_coroutine_threadsafe(get_llm_response_stream(transcript_text, websocket, chat_history), main_loop)
            
        elif transcript_text and transcript_text == last_processed_transcript:
            logging.warning(f"Duplicate turn detected, ignoring: '{transcript_text}'")

    def on_begin(self: Type[StreamingClient], event: BeginEvent): 
        logging.info("Transcription session started.")
    def on_terminated(self: Type[StreamingClient], event: TerminationEvent): 
        logging.info("Transcription session terminated.")
    def on_error(self: Type[StreamingClient], error: StreamingError): 
        logging.error(f"AssemblyAI streaming error: {error}")

    try:
        pass  # Connection will be established when API keys are received

        while True:
            try:
                message = await websocket.receive()
            except WebSocketDisconnect as e:
                logging.info(f"Client disconnected or connection lost: {e}")
                break
            except RuntimeError as e:
                logging.info(f"Connection lost or receive called after disconnect: {e}")
                break
            if "text" in message:
                try:
                    data = json.loads(message['text'])
                    if data.get("type") == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                    elif data.get("type") == "api_keys":
                        # Store user API keys and initialize clients
                        global user_api_keys
                        user_api_keys = data.get("keys", {})
                        logging.info(f"Received API keys: {list(user_api_keys.keys())}")
                        
                        # Validate required keys
                        required_keys = ['gemini', 'assemblyai', 'murf']
                        missing_keys = [key for key in required_keys if not user_api_keys.get(key)]
                        
                        if missing_keys:
                            await send_client_message(websocket, {
                                "type": "error", 
                                "message": f"Missing required API keys: {', '.join(missing_keys)}"
                            })
                            continue
                        
                        # Initialize clients with user keys
                        try:
                            initialize_clients_with_keys(user_api_keys)
                            logging.info("Successfully initialized AI clients with user API keys")
                        except Exception as e:
                            logging.error(f"Failed to initialize AI clients: {e}")
                            await send_client_message(websocket, {
                                "type": "error", 
                                "message": f"Failed to initialize AI services: {str(e)}"
                            })
                            continue
                        
                        # Initialize AssemblyAI client
                        try:
                            client = StreamingClient(StreamingClientOptions(api_key=user_api_keys['assemblyai']))
                            client.on(StreamingEvents.Begin, on_begin)
                            client.on(StreamingEvents.Turn, on_turn)
                            client.on(StreamingEvents.Termination, on_terminated)
                            client.on(StreamingEvents.Error, on_error)
                            
                            client.connect(StreamingParameters(sample_rate=16000, format_turns=True))
                            await send_client_message(websocket, {"type": "status", "message": "Connected to transcription service."})
                            logging.info("AssemblyAI client connected successfully")
                        except Exception as e:
                            logging.error(f"Failed to connect to AssemblyAI: {e}")
                            await send_client_message(websocket, {"type": "error", "message": "Failed to connect to transcription service."})
                            continue
                except (json.JSONDecodeError, TypeError): pass
            elif "bytes" in message:
                if message['bytes'] and client:
                    client.stream(message['bytes'])
    except Exception as e:
        logging.error(f"WebSocket error: {e}", exc_info=True)
    finally:
        if llm_task and not llm_task.done():
            llm_task.cancel()
        logging.info("Cleaning up connection resources.")
        if client:
            client.disconnect()
        if websocket.client_state.name != 'DISCONNECTED':
            await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8020)