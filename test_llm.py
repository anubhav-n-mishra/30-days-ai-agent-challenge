#!/usr/bin/env python3
"""
Day 8: Test script for the LLM Query endpoint
Demonstrates the Google Gemini API integration
"""

import requests
import json

def test_llm_endpoint():
    """Test the /llm/query endpoint with various prompts"""
    
    base_url = "http://127.0.0.1:8000"
    endpoint = f"{base_url}/llm/query"
    
    # Test cases
    test_prompts = [
        "What is artificial intelligence?",
        "Explain the difference between machine learning and deep learning",
        "Write a short poem about programming",
        "What are the benefits of using FastAPI for building APIs?",
        "How do voice agents work?"
    ]
    
    print("🤖 Testing Day 8: LLM Query Endpoint")
    print("=" * 50)
    
    for i, prompt in enumerate(test_prompts, 1):
        print(f"\n📝 Test {i}: {prompt}")
        print("-" * 40)
        
        try:
            # Make API request
            payload = {"text": prompt}
            response = requests.post(endpoint, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success: {data['success']}")
                print(f"🧠 Model: {data['model_used']}")
                print(f"💬 Response: {data['response'][:200]}...")
                if len(data['response']) > 200:
                    print("   [Response truncated for display]")
            else:
                print(f"❌ Error: {response.status_code}")
                print(f"   {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
        
        print()

if __name__ == "__main__":
    test_llm_endpoint()
