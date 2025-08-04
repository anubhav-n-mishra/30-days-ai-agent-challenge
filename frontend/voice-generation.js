// Voice Generation Page JavaScript
console.log('Voice Generation JavaScript loaded successfully!');

class VoiceGenerator {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateCharacterCount();
        this.setupRangeSliders();
    }

    bindEvents() {
        // Text input events
        const textArea = document.getElementById('customText');
        textArea.addEventListener('input', () => {
            this.updateCharacterCount();
            this.adjustTextareaHeight();
        });

        // Generate button
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generateSpeech();
        });

        // Clear button
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearText();
        });

        // Range sliders
        document.getElementById('speedRange').addEventListener('input', (e) => {
            this.updateSpeedDisplay(e.target.value);
        });

        document.getElementById('pitchRange').addEventListener('input', (e) => {
            this.updatePitchDisplay(e.target.value);
        });

        // Audio events
        const audio = document.getElementById('generatedAudio');
        audio.addEventListener('loadedmetadata', () => {
            this.updateAudioInfo();
        });
    }

    updateCharacterCount() {
        const textArea = document.getElementById('customText');
        const charCount = document.getElementById('charCount');
        const count = textArea.value.length;
        charCount.textContent = `${count} characters`;
        
        // Change color based on limit
        if (count > 4500) {
            charCount.className = 'absolute bottom-3 right-3 text-xs text-red-400';
        } else if (count > 4000) {
            charCount.className = 'absolute bottom-3 right-3 text-xs text-yellow-400';
        } else {
            charCount.className = 'absolute bottom-3 right-3 text-xs text-gray-400';
        }
    }

    adjustTextareaHeight() {
        const textArea = document.getElementById('customText');
        textArea.style.height = 'auto';
        textArea.style.height = Math.max(160, textArea.scrollHeight) + 'px';
    }

    setupRangeSliders() {
        // Style range sliders
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.style.background = `linear-gradient(to right, #3b82f6 0%, #3b82f6 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 100%)`;
        });
    }

    updateSpeedDisplay(value) {
        const display = document.getElementById('speedValue');
        const speeds = {
            '-3': 'Very Slow',
            '-2': 'Slow',
            '-1': 'Slightly Slow',
            '0': 'Normal',
            '1': 'Slightly Fast',
            '2': 'Fast',
            '3': 'Very Fast'
        };
        display.textContent = speeds[value] || 'Normal';
    }

    updatePitchDisplay(value) {
        const display = document.getElementById('pitchValue');
        const pitches = {
            '-3': 'Very Low',
            '-2': 'Low',
            '-1': 'Slightly Low',
            '0': 'Normal',
            '1': 'Slightly High',
            '2': 'High',
            '3': 'Very High'
        };
        display.textContent = pitches[value] || 'Normal';
    }

    async generateSpeech() {
        console.log('Generate speech button clicked!');
        const textArea = document.getElementById('customText');
        const text = textArea.value.trim();
        console.log('Text to generate:', text);

        if (!text) {
            this.showNotification('Please enter some text to generate speech', 'error');
            return;
        }

        if (text.length > 5000) {
            this.showNotification('Text is too long. Maximum 5000 characters allowed.', 'error');
            return;
        }

        const generateBtn = document.getElementById('generateBtn');
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        // Show loading state
        generateBtn.disabled = true;
        generateBtn.innerHTML = `
            <svg class="animate-spin w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 2a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h12v11H4V4z" clip-rule="evenodd"></path>
            </svg>
            <span>Generating...</span>
        `;
        loadingOverlay.classList.remove('hidden');

        try {
            const requestData = {
                text: text,
                voice_id: document.getElementById('voiceSelect').value,
                rate: document.getElementById('speedRange').value,
                pitch: document.getElementById('pitchRange').value
            };

            const response = await fetch('/tts/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.displayAudioPlayer(result.audio_url);
                this.showNotification('Speech generated successfully!', 'success');
            } else {
                throw new Error(result.detail || 'Failed to generate speech');
            }
        } catch (error) {
            console.error('TTS Error:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            // Reset button state
            generateBtn.disabled = false;
            generateBtn.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
                </svg>
                <span>Generate Speech</span>
            `;
            loadingOverlay.classList.add('hidden');
        }
    }

    displayAudioPlayer(audioUrl) {
        const audioSection = document.getElementById('audioSection');
        const audio = document.getElementById('generatedAudio');
        const downloadBtn = document.getElementById('downloadBtn');

        audio.src = audioUrl;
        downloadBtn.href = audioUrl;
        
        audioSection.classList.remove('hidden');
        audioSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    updateAudioInfo() {
        const audio = document.getElementById('generatedAudio');
        const lengthDisplay = document.getElementById('audioLength');
        
        if (audio.duration) {
            const minutes = Math.floor(audio.duration / 60);
            const seconds = Math.floor(audio.duration % 60);
            lengthDisplay.textContent = `Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    clearText() {
        const textArea = document.getElementById('customText');
        const audioSection = document.getElementById('audioSection');
        
        textArea.value = '';
        this.updateCharacterCount();
        this.adjustTextareaHeight();
        audioSection.classList.add('hidden');
        
        this.showNotification('Text cleared', 'info');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform translate-x-full transition-transform duration-500 ease-in-out`;
        
        // Set color based on type
        const colors = {
            success: 'bg-green-600 text-white',
            error: 'bg-red-600 text-white',
            info: 'bg-blue-600 text-white',
            warning: 'bg-yellow-600 text-black'
        };
        
        notification.className += ` ${colors[type] || colors.info}`;
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-lg">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 500);
            }
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VoiceGenerator();
});

// Export for potential use in other scripts
window.VoiceGenerator = VoiceGenerator;
