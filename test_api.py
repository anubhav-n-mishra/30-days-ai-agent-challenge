#!/usr/bin/env python3
"""
Quick test script for the TTS API
Run this to test the Day 2 implementation
"""

import requests
import json

def test_tts_api():
    """Test the TTS API endpoint"""
    
    base_url = "http://localhost:8000"
    
    print("🎙️ Testing Day 2 TTS API...")
    print("="*50)
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health check: PASSED")
        else:
            print("❌ Health check: FAILED")
    except Exception as e:
        print(f"❌ Health check: ERROR - {e}")
    
    # Test TTS endpoint
    tts_data = {
        "text": "Hello! This is Day 2 of the 30 Days Voice Agent challenge. Testing TTS functionality!",
        "voice_id": "en-US-ken",
        "rate": "0",
        "pitch": "0"
    }
    
    try:
        print("\n🔄 Testing TTS generation...")
        response = requests.post(
            f"{base_url}/tts/generate",
            json=tts_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success") and result.get("audio_url"):
                print("✅ TTS generation: PASSED")
                print(f"🎵 Audio URL: {result['audio_url']}")
                print(f"📝 Message: {result['message']}")
            else:
                print("⚠️ TTS generation: PARTIAL - No audio URL returned")
                print(f"Response: {result}")
        else:
            print(f"❌ TTS generation: FAILED - Status {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ TTS generation: ERROR - {e}")
    
    # Test voices endpoint
    try:
        print("\n🔄 Testing voices endpoint...")
        response = requests.get(f"{base_url}/tts/voices")
        if response.status_code == 200:
            voices = response.json()
            print("✅ Voices endpoint: PASSED")
            print(f"📋 Available voices: {len(voices) if isinstance(voices, list) else 'See response'}")
        else:
            print(f"❌ Voices endpoint: FAILED - Status {response.status_code}")
    except Exception as e:
        print(f"❌ Voices endpoint: ERROR - {e}")
    
    print("\n" + "="*50)
    print("🌐 Quick Links:")
    print(f"   Frontend: {base_url}/")
    print(f"   API Docs: {base_url}/docs")
    print(f"   Navigation: {base_url}/nav")
    print("\n💡 Ready for LinkedIn demonstration!")

if __name__ == "__main__":
    test_tts_api()
