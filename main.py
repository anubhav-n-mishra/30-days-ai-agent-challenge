import os
from dotenv import load_dotenv
import logging
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
app = FastAPI()

BASE_DIR = PathLib(__file__).resolve().parent
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Initialize Tavily client for web search
tavily_client = None
# Use the working API key directly for now
working_tavily_key = "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"
if working_tavily_key or config.TAVILY_API_KEY:
    try:
        # Try the working key first, fallback to config
        api_key = working_tavily_key if working_tavily_key else config.TAVILY_API_KEY
        tavily_client = TavilyClient(api_key=api_key)
        logging.info("✅ Tavily client initialized successfully with working API key.")
    except Exception as e:
        logging.warning(f"Failed to initialize Tavily client: {e}")
else:
    logging.warning("Tavily API key not found. Web search functionality will be disabled.")

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

# Configure Gemini with function calling capabilities
if config.GEMINI_API_KEY:
    genai.configure(api_key=config.GEMINI_API_KEY)
    
    # Define the search function schema for Gemini (updated format)
    search_function_declaration = genai.protos.FunctionDeclaration(
        name="search_web",
        description="Search the web for current information, news, weather, or any topic that requires up-to-date data",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "query": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="The search query to look up on the web"
                )
            },
            required=["query"]
        )
    )
    
    # Initialize Gemini model with function calling
    search_tool = genai.protos.Tool(function_declarations=[search_function_declaration])
    gemini_model = genai.GenerativeModel(
        'gemini-1.5-flash',
        tools=[search_tool]
    )
    logging.info("Gemini model initialized with web search capability.")
else:
    gemini_model = None
    logging.warning("Gemini model not initialized. GEMINI_API_KEY is missing.")


async def get_llm_response_stream(transcript: str, client_websocket: WebSocket, chat_history: List[dict]):
    if not transcript or not transcript.strip():
        return

    if not gemini_model:
        logging.error("Cannot get LLM response because Gemini model is not initialized.")
        return

    logging.info(f"Sending to Gemini with history: '{transcript}'")
    
    murf_uri = f"wss://api.murf.ai/v1/speech/stream-input?api-key={config.MURF_API_KEY}&sample_rate=44100&channel_type=MONO&format=MP3"

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
                        # Check if the query requires web search
                        search_keywords = ['weather', 'news', 'current', 'latest', 'today', 'recent', 'now', 'happening']
                        should_search = any(keyword in transcript.lower() for keyword in search_keywords)
                        
                        if should_search:
                            logging.info(f"🔍 Query contains search keywords, forcing web search for: {transcript}")
                            # Directly perform search and then ask Gemini to respond with the results
                            search_results = search_web(transcript)
                            logging.info(f"📊 Search completed: {search_results[:100]}...")
                            
                            # Create a prompt that includes the search results
                            enhanced_prompt = (
                                f"You are Lelouch vi Britannia. The user asked: '{transcript}'\n"
                                f"Your strategic intelligence network has gathered this information:\n{search_results}\n\n"
                                f"Present this information as Lelouch would, referring to your 'strategic intelligence network' "
                                f"or 'intelligence sources'. Be formal and strategic in your response."
                            )
                            
                            response = chat.send_message(enhanced_prompt, stream=True)
                            return response
                        else:
                            # For non-search queries, use regular function calling approach
                            response = chat.send_message(persona_prompt)
                            
                            # Debug: Print response structure
                            logging.info(f"🔍 Response candidates: {len(response.candidates) if response.candidates else 0}")
                            if response.candidates and response.candidates[0].content.parts:
                                logging.info(f"🔍 Parts in response: {len(response.candidates[0].content.parts)}")
                                for i, part in enumerate(response.candidates[0].content.parts):
                                    logging.info(f"🔍 Part {i}: has_function_call={hasattr(part, 'function_call')}")
                                    if hasattr(part, 'function_call') and part.function_call:
                                        logging.info(f"🔍 Function call detected: {part.function_call.name}")
                            
                            # Check if function calling is needed
                            if response.candidates and response.candidates[0].content.parts:
                                for part in response.candidates[0].content.parts:
                                    if hasattr(part, 'function_call') and part.function_call:
                                        function_call = part.function_call
                                        if function_call.name == "search_web":
                                            query = function_call.args.get("query", "")
                                            logging.info(f"🔍 Lelouch is searching the web for: {query}")
                                            
                                            # Execute the search
                                            search_results = search_web(query)
                                            logging.info(f"📊 Search results obtained: {search_results[:100]}...")
                                            
                                            # Create proper function response
                                            function_response = genai.protos.Part(
                                                function_response=genai.protos.FunctionResponse(
                                                    name="search_web",
                                                    response={"result": search_results}
                                                )
                                            )
                                            
                                            # Get the final response with search results
                                            logging.info("🧠 Sending search results back to Lelouch...")
                                            final_response = chat.send_message([function_response], stream=True)
                                            return final_response
                            
                            # If no function calling detected, return the original response as stream
                            logging.info("ℹ️ No function calling detected, using direct response")
                            return response
                        
                    except Exception as e:
                        logging.error(f"❌ Error in function calling: {e}")
                        # Fallback to regular response without function calling
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


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

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
    
    if not config.ASSEMBLYAI_API_KEY:
        logging.error("ASSEMBLYAI_API_KEY not configured")
        await send_client_message(websocket, {"type": "error", "message": "AssemblyAI API key not configured on the server."})
        await websocket.close(code=1000)
        return

    client = StreamingClient(StreamingClientOptions(api_key=config.ASSEMBLYAI_API_KEY))

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
            
            llm_task = asyncio.run_coroutine_threadsafe(get_llm_response_stream(transcript_text, websocket, chat_history), main_loop)
            
        elif transcript_text and transcript_text == last_processed_transcript:
            logging.warning(f"Duplicate turn detected, ignoring: '{transcript_text}'")

    def on_begin(self: Type[StreamingClient], event: BeginEvent): logging.info(f"Transcription session started.")
    def on_terminated(self: Type[StreamingClient], event: TerminationEvent): logging.info(f"Transcription session terminated.")
    def on_error(self: Type[StreamingClient], error: StreamingError): logging.error(f"AssemblyAI streaming error: {error}")

    client.on(StreamingEvents.Begin, on_begin)
    client.on(StreamingEvents.Turn, on_turn)
    client.on(StreamingEvents.Termination, on_terminated)
    client.on(StreamingEvents.Error, on_error)

    try:
        client.connect(StreamingParameters(sample_rate=16000, format_turns=True))
        await send_client_message(websocket, {"type": "status", "message": "Connected to transcription service."})

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
                except (json.JSONDecodeError, TypeError): pass
            elif "bytes" in message:
                if message['bytes']:
                    client.stream(message['bytes'])
    except Exception as e:
        logging.error(f"WebSocket error: {e}", exc_info=True)
    finally:
        if llm_task and not llm_task.done():
            llm_task.cancel()
        logging.info("Cleaning up connection resources.")
        client.disconnect()
        if websocket.client_state.name != 'DISCONNECTED':
            await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)