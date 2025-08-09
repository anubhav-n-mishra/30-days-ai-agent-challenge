# 🎙️ 30 Days of AI Voice Agents Challenge

> **Building a comprehensive AI voice agent from scratch in 30 days**

![Voice Agent Banner](https://img.shields.io/badge/AI%20Voice%20Agent-30%20Days%20Challenge-blue?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-00a68a?style=flat-square)
![Murf API](https://img.shields.io/badge/Murf%20TTS-Integrated-purple?style=flat-square)
![Progress](https://img.shields.io/badge/Progress-Day%203%2F30-green?style=flat-square)

## 🚀 **Project Overview**

This repository documents my journey building an advanced AI voice agent application over 30 days. Each day focuses on implementing specific features, learning new technologies, and creating a comprehensive voice AI system.

### **🎯 Current Status: Day 3/30**

✅ **Day 1**: Frontend Setup with Glassmorphism Design  
✅ **Day 2**: TTS API Integration with Murf  
✅ **Day 3**: Advanced Voice Generation & UI Enhancement  
🔄 **Day 4-30**: *Coming Soon...*

## 🌟 **Live Demo**

🔗 **[Try the Voice Agent Live](http://localhost:8000)** *(Run locally)*

### **Key Features Available:**
- 🎨 **Beautiful UI**: Modern glassmorphism design with responsive layout
- 🎙️ **Text-to-Speech**: Convert any text to natural-sounding speech
- 🎵 **155+ Voices**: Multiple languages, accents, and voice styles
- ⚙️ **Voice Controls**: Adjust speed, pitch, and voice characteristics
- 📱 **Responsive**: Works seamlessly on desktop, tablet, and mobile
- 🔊 **Audio Download**: Save generated speech as MP3 files

## 🛠️ **Technology Stack**

### **Frontend**
- **HTML5** - Semantic structure and accessibility
- **Tailwind CSS** - Utility-first styling and responsive design
- **Vanilla JavaScript** - Clean, dependency-free interactivity
- **CSS3** - Advanced animations and glassmorphism effects

### **Backend**
- **FastAPI** - Modern, fast Python web framework
- **Python 3.8+** - Core programming language
- **Pydantic** - Data validation and settings management
- **Uvicorn** - ASGI server for production deployment

### **External Services**
- **Murf API** - High-quality text-to-speech conversion
- **Git/GitHub** - Version control and collaboration

## 📁 **Project Structure**

```
30-days-ai-agent-challenge/
├── 📁 backend/                 # FastAPI application
│   ├── main.py                 # API endpoints and server logic
│   └── .env                    # Environment variables (API keys)
├── 📁 frontend/                # Web interface
│   ├── index.html              # Landing page
│   ├── voice-generation.html   # Advanced TTS interface
│   ├── script.js               # Main page interactions
│   └── voice-generation.js     # Advanced page functionality
├── 📁 explanation/             # Daily learning documentation
│   ├── day-01-frontend-setup.md
│   ├── day-02-tts-api-integration.md
│   └── day-03-advanced-voice-generation.md
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

## 🚀 **Quick Start**

### **Prerequisites**
- Python 3.8 or higher
- Murf API account and API key
- Git (for cloning)

### **1. Clone the Repository**
```bash
git clone https://github.com/anubhav-n-mishra/30-days-ai-agent-challenge.git
cd 30-days-ai-agent-challenge
```

### **2. Install Dependencies**
```bash
pip install -r requirements.txt
```

### **3. Environment Setup**
Create a `.env` file in the project root:
```env
MURF_API_KEY=your_murf_api_key_here
MURF_BASE_URL=https://api.murf.ai/v1
```

### **4. Run the Application**
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### **5. Access the Application**
- **Main App**: http://localhost:8000
- **Voice Generation**: http://localhost:8000/voice-generation
- **API Docs**: http://localhost:8000/docs

## 📚 **Daily Learning Journey**

Each day's progress is documented in detail in the `explanation/` folder:

### **📖 [Day 1: Frontend Setup](explanation/day-01-frontend-setup.md)**
- **Focus**: UI/UX design and responsive layout
- **Technologies**: HTML5, Tailwind CSS, CSS animations
- **Key Learning**: Glassmorphism design implementation
- **Time Invested**: 2-3 hours

### **📖 [Day 2: TTS API Integration](explanation/day-02-tts-api-integration.md)**
- **Focus**: Backend development and API integration
- **Technologies**: FastAPI, Murf API, async programming
- **Key Learning**: External API authentication and error handling
- **Time Invested**: 4-5 hours

### **📖 [Day 3: Advanced Voice Generation](explanation/day-03-advanced-voice-generation.md)**
- **Focus**: Advanced features and user experience
- **Technologies**: JavaScript classes, file serving, UI enhancements
- **Key Learning**: Complex form handling and audio controls
- **Time Invested**: 5-6 hours

## 🎯 **API Endpoints**

### **Core Endpoints**
- `POST /tts/generate` - Generate speech from text
- `GET /tts/voices` - List all available voices
- `GET /health` - API health check

### **Example Usage**
```bash
curl -X POST "http://localhost:8000/tts/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello! This is a test of the voice generation system.",
    "voice_id": "en-US-ken",
    "rate": "0",
    "pitch": "0"
  }'
```

## 🎨 **Design System**

### **Color Palette**
- **Primary**: `#1e40af` (Blue 700)
- **Secondary**: `#3b82f6` (Blue 500)
- **Accent**: `#60a5fa` (Blue 400)
- **Background**: Dark gradients with animated elements
- **Text**: High-contrast whites and grays

### **Typography**
- **Headings**: Bold, tracking-tight for impact
- **Body**: Light weight, increased line-height for readability
- **Code**: Monospace with syntax highlighting

## 🧪 **Testing**

### **API Testing**
```bash
# Run the comprehensive API test suite
python test_api.py
```

### **Manual Testing Checklist**
- [ ] Text input accepts spaces and formatting
- [ ] Voice generation works with different voices
- [ ] Audio playback functions correctly
- [ ] Download feature saves proper MP3 files
- [ ] Responsive design works on mobile
- [ ] Error handling displays user-friendly messages

## 🤝 **Contributing**

This is a personal learning challenge, but feedback and suggestions are welcome!

### **How to Contribute**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📅 **Upcoming Features** (Days 4-30)

### **Week 1** (Days 4-7)
- [ ] Voice cloning and custom voices
- [ ] SSML support for advanced speech control
- [ ] Batch text processing
- [ ] User preference storage

### **Week 2** (Days 8-14)
- [ ] Real-time voice synthesis
- [ ] Audio effects and filters
- [ ] Multiple language support
- [ ] Voice analytics dashboard

### **Week 3** (Days 15-21)
- [ ] AI-powered conversation flows
- [ ] Speech-to-text integration
- [ ] Voice command recognition
- [ ] Chatbot integration

### **Week 4** (Days 22-28)
- [ ] Advanced AI features
- [ ] Mobile app development
- [ ] Production deployment
- [ ] Performance optimization

### **Final Days** (Days 29-30)
- [ ] Documentation completion
- [ ] Demo video creation
- [ ] Portfolio integration
- [ ] Future roadmap planning

## 📊 **Project Statistics**

- **Lines of Code**: ~1,200+
- **API Endpoints**: 4 functional
- **Voice Options**: 155+ available
- **Supported Languages**: 20+
- **Test Coverage**: Comprehensive API testing
- **Documentation**: Detailed daily explanations

## 🏆 **Achievements Unlocked**

- ✅ **Frontend Master**: Beautiful, responsive UI design
- ✅ **API Integrator**: Successfully integrated external TTS service
- ✅ **UX Designer**: Intuitive user experience with loading states
- ✅ **Problem Solver**: Debugged authentication and file serving issues
- ✅ **Documentation Writer**: Comprehensive daily learning logs

## 📞 **Contact & Social**

- **GitHub**: [@anubhav-n-mishra](https://github.com/anubhav-n-mishra)
- **LinkedIn**: [Connect with me](https://linkedin.com/in/anubhav-n-mishra)
- **Portfolio**: [anubhav-n-mishra.dev](https://anubhav-n-mishra.dev)

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Murf AI** for providing excellent TTS API services
- **FastAPI** team for the amazing framework
- **Tailwind CSS** for the utility-first CSS framework
- **Community** for inspiration and support

---

**⭐ If you find this project helpful, please give it a star!**

*Last Updated: Day 3 - Advanced Voice Generation Complete*
