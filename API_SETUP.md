# API Key Setup Guide

## Overview
Lelouch AI now features user authentication and requires users to provide their own API keys for the AI services. This ensures better security and allows users to manage their own usage and costs.

## Authentication

### User Registration & Login
- Visit `/auth` to create an account or sign in
- Use your email and password to authenticate
- Your chat history will be saved and accessible across sessions
- Authentication is powered by Supabase

## Required API Keys

### 1. Google Gemini API Key ⭐ (Required)
- **Get it here:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **What it does:** Powers the AI responses and conversation
- **Free tier:** Yes, generous free quota available
- **Key format:** Starts with `AIza...`
- **Steps:**
  1. Go to Google AI Studio
  2. Click "Get API Key"
  3. Create a new API key
  4. Copy the key

### 2. AssemblyAI API Key ⭐ (Required)
- **Get it here:** [AssemblyAI Dashboard](https://www.assemblyai.com/app/account)
- **What it does:** Converts your speech to text
- **Free tier:** Yes, includes free transcription hours
- **Steps:**
  1. Sign up for AssemblyAI
  2. Go to your account dashboard
  3. Copy your API key

### 3. Murf API Key ⭐ (Required)
- **Get it here:** [Murf.ai API](https://murf.ai/api)
- **What it does:** Converts AI responses to speech (Lelouch's voice)
- **Free tier:** Trial available
- **Steps:**
  1. Sign up for Murf.ai
  2. Navigate to API section
  3. Generate and copy your API key

### 4. Tavily API Key 🌐 (Optional)
- **Get it here:** [Tavily Dashboard](https://app.tavily.com/sign-in)
- **What it does:** Enables web search for current information, news, weather
- **Free tier:** Yes, includes free searches
- **Steps:**
  1. Sign up for Tavily
  2. Go to your dashboard
  3. Copy your API key
- **Note:** Without this key, Lelouch AI will still work but won't have access to current web information

## How to Use

### First Time Setup
1. **Start the application:** `python main.py`
2. **Open your browser:** Go to `http://localhost:8019`
3. **Create account:** Click "Login" → "Sign up" to create your account
4. **Configure API Keys:** Click "Configure API Keys" button
5. **Enter your keys:** Fill in the API keys (use the "Get Key →" links for help)
6. **Save & Start:** Click "Save & Start"
7. **Start chatting:** The microphone button will be enabled - start talking!

### Features
- 🎤 **Voice Input:** Speak naturally to Lelouch AI
- 🔊 **Voice Output:** Hear responses in Lelouch's voice
- 🌐 **Web Search:** Ask about current events, weather, news (with Tavily key)
- 💾 **Chat History:** Your conversations are saved and accessible
- 🔐 **Secure:** Your API keys are only stored in your browser session

## Security & Privacy

- ✅ **API keys are stored only in your browser session**
- ✅ **Keys are not saved to disk or database**
- ✅ **Keys are cleared when you close the browser**
- ✅ **Authentication data is securely managed by Supabase**
- ✅ **Chat history is encrypted and tied to your account**
- ✅ **No API keys are logged or transmitted to unauthorized services**

## Troubleshooting

### Common Issues
- **Microphone button disabled?** → Configure your API keys first
- **"Missing required API keys" error?** → Make sure Gemini, AssemblyAI, and Murf keys are provided
- **No web search results?** → Tavily key is optional, but required for current information
- **Can't hear responses?** → Check your Murf API key and browser audio permissions
- **Login issues?** → Check your email/password or create a new account

### Getting Help
- Check the browser console for detailed error messages
- Verify your API keys are valid and have sufficient quota
- Ensure microphone permissions are granted to your browser
- Make sure you're logged in to access chat history features

## Cost Information

- **Gemini:** Free tier with generous limits
- **AssemblyAI:** Free tier includes transcription hours
- **Murf:** Trial available, then pay-per-use
- **Tavily:** Free tier with search quota

All services offer free tiers to get started!