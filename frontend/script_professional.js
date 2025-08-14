// Professional VoiceAI Interface
class VoiceInterface {
    constructor() {
        this.state = 'idle'; // idle, recording, processing
        this.mediaRecorder = null;
        this.recordingTimer = null;
        this.recordingStartTime = null;
        this.audioChunks = [];
        this.messageCount = 0;
        this.sessionId = this.generateSessionId();
        
        // Initialize interface
        this.initializeUI();
        this.bindEvents();
        this.setupAudioConstraints();
    }
    
    generateSessionId() {
        return 'sess_' + Math.random().toString(36).substr(2, 9);
    }
    
    initializeUI() {
        // Set session ID
        document.getElementById('sessionId').textContent = this.sessionId;
        document.getElementById('sessionIdMobile').textContent = this.sessionId;
        
        // Initialize message count
        this.updateMessageCount();
        
        // Set initial status
        this.updateStatus('Ready to listen');
    }
    
    bindEvents() {
        const recordBtn = document.getElementById('recordBtn');
        recordBtn.addEventListener('click', () => this.toggleRecording());
        
        // Clear conversation button
        const clearBtn = document.getElementById('clearConversation');
        clearBtn.addEventListener('click', () => this.clearConversation());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.repeat && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                e.preventDefault();
                this.toggleRecording();
            }
            
            // Escape to stop recording
            if (e.code === 'Escape' && this.state === 'recording') {
                this.stopRecording();
            }
        });
        
        // Auto-continue toggle
        const autoToggle = document.getElementById('autoRecordToggle');
        autoToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.showToast('Auto-continue enabled', 'success');
            } else {
                this.showToast('Auto-continue disabled', 'info');
            }
        });
        
        // Audio ended event for auto-continue
        const audioPlayer = document.getElementById('responseAudio');
        audioPlayer.addEventListener('ended', () => {
            if (document.getElementById('autoRecordToggle').checked && this.state === 'idle') {
                setTimeout(() => this.startRecording(), 1000);
            }
        });
        
        // Handle visibility change (pause recording when tab becomes hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.state === 'recording') {
                this.stopRecording();
            }
        });
    }
    
    async setupAudioConstraints() {
        try {
            // Check for supported MIME types
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/wav'
            ];
            
            this.supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
            
            if (!this.supportedMimeType) {
                throw new Error('No supported audio format found');
            }
            
            console.log('Using MIME type:', this.supportedMimeType);
            
            // Request microphone permission
            await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000
                } 
            });
            
            this.updateStatus('Ready to listen');
            
        } catch (error) {
            console.error('Audio setup failed:', error);
            this.showError('Microphone access denied or not available');
            this.updateStatus('Microphone not available');
        }
    }
    
    async toggleRecording() {
        if (this.state === 'idle') {
            await this.startRecording();
        } else if (this.state === 'recording') {
            this.stopRecording();
        }
    }
    
    async startRecording() {
        if (this.state !== 'idle') return;
        
        try {
            this.setState('recording');
            this.audioChunks = [];
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000
                } 
            });
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: this.supportedMimeType
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                this.processAudio();
            };
            
            this.mediaRecorder.start();
            this.startTimer();
            this.updateStatus('Listening...');
            
        } catch (error) {
            console.error('Recording failed:', error);
            this.showError('Failed to start recording');
            this.setState('idle');
        }
    }
    
    stopRecording() {
        if (this.state !== 'recording' || !this.mediaRecorder) return;
        
        this.mediaRecorder.stop();
        this.stopTimer();
        this.setState('processing');
    }
    
    startTimer() {
        this.recordingStartTime = Date.now();
        const timerElement = document.getElementById('timer');
        const timerContainer = document.getElementById('recordingTimer');
        const waveElement = document.getElementById('audioWave');
        
        timerContainer.classList.remove('hidden');
        waveElement.classList.remove('hidden');
        
        this.recordingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            timerElement.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }
    
    stopTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        document.getElementById('recordingTimer').classList.add('hidden');
        document.getElementById('audioWave').classList.add('hidden');
    }
    
    async processAudio() {
        if (this.audioChunks.length === 0) {
            this.showError('No audio recorded');
            this.setState('idle');
            return;
        }
        
        try {
            this.showProcessingSteps();
            this.updateStatus('Processing your request...');
            
            // Create blob from chunks
            const audioBlob = new Blob(this.audioChunks, { 
                type: this.supportedMimeType 
            });
            
            if (audioBlob.size === 0) {
                throw new Error('Empty audio recording');
            }
            
            console.log('Audio blob created:', {
                size: audioBlob.size,
                type: audioBlob.type
            });
            
            // Prepare form data
            const formData = new FormData();
            const fileName = `recording_${Date.now()}.${this.getFileExtension()}`;
            formData.append('file', audioBlob, fileName);
            
            this.updateProcessingStep(1, 'complete');
            this.updateProcessingStep(2, 'active');
            
            // Send to server
            const response = await fetch(`/agent/chat/${this.sessionId}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText,
                    url: response.url
                });
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            
            this.updateProcessingStep(2, 'complete');
            this.updateProcessingStep(3, 'complete');
            this.updateProcessingStep(4, 'complete');
            
            // Check if the response was successful
            if (!data.success) {
                throw new Error(data.message || 'Server processing failed');
            }
            
            this.displayResults(data);
            this.messageCount++;
            this.updateMessageCount();
            
        } catch (error) {
            console.error('Processing failed:', error);
            this.showError(`Failed to process audio: ${error.message}`);
            this.hideProcessingSteps();
        } finally {
            this.setState('idle');
        }
    }
    
    getFileExtension() {
        if (this.supportedMimeType.includes('webm')) return 'webm';
        if (this.supportedMimeType.includes('mp4')) return 'mp4';
        if (this.supportedMimeType.includes('wav')) return 'wav';
        return 'webm';
    }
    
    showProcessingSteps() {
        const container = document.getElementById('processingStatus');
        container.classList.remove('hidden');
        
        // Reset all steps
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`step${i}`);
            step.classList.remove('active', 'complete');
        }
        
        // Start first step
        this.updateProcessingStep(1, 'active');
    }
    
    hideProcessingSteps() {
        setTimeout(() => {
            document.getElementById('processingStatus').classList.add('hidden');
        }, 1000);
    }
    
    updateProcessingStep(stepNumber, status) {
        const step = document.getElementById(`step${stepNumber}`);
        step.classList.remove('active', 'complete');
        if (status !== 'inactive') {
            step.classList.add(status);
        }
    }
    
    displayResults(data) {
        const resultsContainer = document.getElementById('resultsContainer');
        const conversationHistory = document.getElementById('conversationHistory');
        
        // Create new conversation entry
        const conversationEntry = this.createConversationEntry(data);
        
        // Show results container if hidden
        if (resultsContainer.classList.contains('hidden')) {
            resultsContainer.classList.remove('hidden');
            resultsContainer.classList.add('slide-up');
        }
        
        // Add the new conversation entry
        conversationHistory.appendChild(conversationEntry);
        
        // Play audio response
        if (data.audio_url) {
            const responseAudio = document.getElementById('responseAudio');
            responseAudio.src = data.audio_url;
            responseAudio.load();
        }
        
        this.updateStatus('Response ready');
        
        // Smooth scroll to latest message on mobile
        if (window.innerWidth < 1024) {
            setTimeout(() => {
                conversationEntry.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }, 300);
        }
    }
    
    clearConversation() {
        const conversationHistory = document.getElementById('conversationHistory');
        const resultsContainer = document.getElementById('resultsContainer');
        
        // Clear all conversation entries
        conversationHistory.innerHTML = '';
        
        // Hide the conversation container
        resultsContainer.classList.add('hidden');
        
        // Reset message count
        this.messageCount = 0;
        this.updateMessageCount();
        
        // Show toast
        this.showToast('Conversation cleared', 'info');
    }
    
    createConversationEntry(data) {
        const entryContainer = document.createElement('div');
        entryContainer.className = 'conversation-entry space-y-4 mb-6';
        
        // User message
        const userMessage = document.createElement('div');
        userMessage.className = 'conversation-message message-user';
        userMessage.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">You</div>
                    <div class="content text-slate-700 dark:text-slate-300 leading-relaxed">${data.transcription || 'No transcription available'}</div>
                </div>
            </div>
        `;
        
        // AI response
        const aiMessage = document.createElement('div');
        aiMessage.className = 'conversation-message message-assistant';
        
        const responseText = data.response || 'No response available';
        let formattedResponse;
        
        // Format response with markdown
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true,
                sanitize: false,
                smartLists: true,
                smartypants: true
            });
            formattedResponse = marked.parse(responseText);
        } else {
            // Fallback formatting
            formattedResponse = responseText
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');
        }
        
        aiMessage.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">AI Assistant</div>
                    <div class="content text-slate-700 dark:text-slate-300 leading-relaxed">${formattedResponse}</div>
                </div>
            </div>
        `;
        
        entryContainer.appendChild(userMessage);
        entryContainer.appendChild(aiMessage);
        
        // Add fade-in animation
        entryContainer.classList.add('fade-in');
        
        return entryContainer;
    }
    
    setState(newState) {
        this.state = newState;
        this.updateButtonState();
    }
    
    updateButtonState() {
        const recordBtn = document.getElementById('recordBtn');
        const recordIcon = document.getElementById('recordIcon');
        
        // Remove all state classes
        recordBtn.classList.remove('recording', 'processing');
        recordBtn.disabled = false;
        
        switch (this.state) {
            case 'idle':
                recordBtn.setAttribute('aria-label', 'Start recording');
                recordIcon.innerHTML = `
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                `;
                break;
                
            case 'recording':
                recordBtn.classList.add('recording');
                recordBtn.setAttribute('aria-label', 'Stop recording');
                recordIcon.innerHTML = `
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                `;
                break;
                
            case 'processing':
                recordBtn.classList.add('processing');
                recordBtn.disabled = true;
                recordBtn.setAttribute('aria-label', 'Processing...');
                recordIcon.innerHTML = `
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                `;
                break;
        }
    }
    
    updateStatus(text) {
        const statusText = document.getElementById('statusText');
        statusText.textContent = text;
    }
    
    updateMessageCount() {
        document.getElementById('messageCount').textContent = this.messageCount;
        document.getElementById('messageCountMobile').textContent = this.messageCount;
    }
    
    showError(message) {
        this.showToast(message, 'error');
        console.error('VoiceInterface Error:', message);
    }
    
    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-white font-medium transform transition-all duration-300 translate-x-full`;
        
        switch (type) {
            case 'success':
                toast.classList.add('bg-emerald-500');
                break;
            case 'error':
                toast.classList.add('bg-red-500');
                break;
            case 'warning':
                toast.classList.add('bg-amber-500');
                break;
            default:
                toast.classList.add('bg-blue-500');
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.voiceInterface = new VoiceInterface();
    console.log('Professional VoiceAI Interface initialized');
});

// Service worker registration for PWA capabilities (optional)
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
*/
