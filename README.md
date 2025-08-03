# 30 Days of Voice Agents - Day 2

## Text-to-Speech API with Murf Integration

This project implements a FastAPI server with Text-to-Speech functionality using Murf's API.

### Features

- ✅ Modern FastAPI server with automatic documentation
- ✅ Text-to-Speech endpoint using Murf API
- ✅ Secure API key management with .env files
- ✅ Voice selection and customization options
- ✅ Professional error handling and validation
- ✅ Interactive API documentation at `/docs`

### Setup Instructions

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your Murf API key to the `.env` file:
     ```
     MURF_API_KEY=your_actual_murf_api_key_here
     ```

3. **Run the Server**
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

4. **Access the API**
   - Frontend: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

### API Endpoints

#### POST `/tts/generate`
Converts text to speech using Murf's TTS API.

**Request Body:**
```json
{
  "text": "Hello, this is a test of the text-to-speech system!",
  "voice_id": "en-US-ken",
  "rate": "0",
  "pitch": "0"
}
```

**Response:**
```json
{
  "success": true,
  "audio_url": "https://murf-audio-files.s3.amazonaws.com/...",
  "message": "Speech generated successfully"
}
```

#### GET `/tts/voices`
Retrieves available voices from Murf API.

### Usage with FastAPI Docs

1. Navigate to http://localhost:8000/docs
2. Click on the "POST /tts/generate" endpoint
3. Click "Try it out"
4. Enter your text and voice preferences
5. Click "Execute" to test the endpoint

### Day 2 Task Completion

✅ Created REST TTS endpoint that accepts text
✅ Integrated with Murf's `/generate` API
✅ Returns URL pointing to generated audio file
✅ Secure API key management with .env
✅ Professional FastAPI documentation
✅ Ready for LinkedIn demonstration

### Security Notes

- API keys are stored in `.env` files (not committed to version control)
- `.env.example` provides template without sensitive data
- All API calls are properly authenticated
- Error handling prevents API key exposure

### Next Steps

- Test the endpoint using FastAPI's `/docs` interface
- Take screenshots for LinkedIn post
- Submit completion form: https://forms.gle/4HocRJbAhESLVUAH9
