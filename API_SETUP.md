# API Key Setup Guide

## Overview
This application now requires users to provide their own API keys for the AI services. The Supabase configuration remains on the server.

## Required API Keys

### 1. Google Gemini API Key
- Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
- Create a new API key
- Copy the key (starts with `AIza...`)

### 2. AssemblyAI API Key
- Sign up at [AssemblyAI](https://www.assemblyai.com/)
- Go to your dashboard
- Copy your API key

### 3. Murf API Key
- Sign up at [Murf.ai](https://murf.ai/)
- Go to API settings
- Generate and copy your API key

### 4. Tavily API Key (Optional)
- Sign up at [Tavily](https://tavily.com/)
- Get your API key for web search functionality
- This is optional - the app works without web search

## How to Use

1. Start the application: `python main.py`
2. Open your browser to `http://localhost:8000`
3. Click "Configure API Keys" button
4. Enter your API keys in the modal
5. Click "Save & Start"
6. The microphone button will be enabled
7. Start using the voice AI!

## Security Notes

- API keys are stored only in your browser session
- Keys are not saved to disk or sent to any external servers except the respective AI services
- Keys are cleared when you close the browser tab
- The Supabase configuration remains secure on the server

## Troubleshooting

- If the microphone button is disabled, you need to configure your API keys first
- Make sure all required API keys are provided (Gemini, AssemblyAI, Murf)
- Tavily key is optional for web search functionality