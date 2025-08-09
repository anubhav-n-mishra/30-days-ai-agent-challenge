// Voice Generation Page JavaScript
console.log('Voice Generation JavaScript loaded successfully!');

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeVoiceControls();
});

// Initialize voice controls and character counter
function initializeVoiceControls() {
    const textArea = document.getElementById('customText');
    const speedRange = document.getElementById('speedRange');
    const pitchRange = document.getElementById('pitchRange');
    
    if (textArea) {
        // Character counter
        textArea.addEventListener('input', updateCharacterCount);
        textArea.addEventListener('input', adjustTextareaHeight);
        updateCharacterCount(); // Initial count
    }
    
    if (speedRange) {
        speedRange.addEventListener('input', (e) => updateSpeedDisplay(e.target.value));
        updateSpeedDisplay(speedRange.value); // Initial display
    }
    
    if (pitchRange) {
        pitchRange.addEventListener('input', (e) => updatePitchDisplay(e.target.value));
        updatePitchDisplay(pitchRange.value); // Initial display
    }
}

// Update character count with visual feedback
function updateCharacterCount() {
    const textArea = document.getElementById('customText');
    const charCount = document.getElementById('charCount');
    
    if (!textArea || !charCount) return;
    
    const count = textArea.value.length;
    charCount.textContent = `${count} characters`;
    
    // Change color based on limit
    if (count > 4500) {
        charCount.className = 'absolute bottom-3 right-3 text-xs text-red-400';
    } else if (count > 4000) {
        charCount.className = 'absolute bottom-3 right-3 text-xs text-yellow-400';
    } else {
        charCount.className = 'absolute bottom-3 right-3 text-xs text-slate-400';
    }
}

// Auto-resize textarea
function adjustTextareaHeight() {
    const textArea = document.getElementById('customText');
    if (!textArea) return;
    
    textArea.style.height = 'auto';
    textArea.style.height = Math.max(100, textArea.scrollHeight) + 'px';
}

// Update speed display
function updateSpeedDisplay(value) {
    const display = document.getElementById('speedValue');
    if (!display) return;
    
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

// Update pitch display
function updatePitchDisplay(value) {
    const display = document.getElementById('pitchValue');
    if (!display) return;
    
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

// Generate voice with enhanced functionality
async function generateVoice() {
    const textArea = document.getElementById('customText');
    const voiceSelect = document.getElementById('voiceSelect');
    const speedRange = document.getElementById('speedRange');
    const pitchRange = document.getElementById('pitchRange');
    const audioPlayer = document.getElementById('audioPlayer');
    const downloadBtn = document.getElementById('downloadBtn');
    const audioSection = document.getElementById('audioSection');
    
    if (!textArea) {
        showNotification('❌ Error: Text input not found', 'error');
        return;
    }
    
    const text = textArea.value; // Preserve all whitespace including leading/trailing spaces
    if (!text || text.replace(/\s/g, '').length === 0) { // Check if text is empty or only whitespace
        showNotification('⚠️ Please enter some text to generate speech', 'warning');
        return;
    }
    
    if (text.length > 5000) {
        showNotification('⚠️ Text is too long (max 5000 characters)', 'warning');
        return;
    }

    try {
        showNotification('🎤 Generating speech...', 'info');
        
        // Prepare request data with voice settings
        const requestData = {
            text: text,
            voice_id: voiceSelect ? voiceSelect.value : 'en-US-ken',
            rate: speedRange ? speedRange.value : '0',
            pitch: pitchRange ? pitchRange.value : '0'
        };
        
        const response = await fetch('/tts/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('TTS response:', data);
        
        if (data.success && data.audio_url) {
            // Set up audio player
            if (audioPlayer && audioSection) {
                audioPlayer.src = data.audio_url;
                audioSection.classList.remove('hidden');
                
                // Setup download functionality
                if (downloadBtn) {
                    downloadBtn.onclick = () => {
                        const a = document.createElement('a');
                        a.href = data.audio_url;
                        a.download = `tts-audio-${Date.now()}.mp3`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        showNotification('📥 Audio downloaded!', 'success');
                    };
                }
                
                // Auto-play the audio
                setTimeout(() => {
                    audioPlayer.play().catch(e => console.log('Auto-play prevented'));
                }, 500);
            }
            
            showNotification('🎉 Speech generated successfully!', 'success');
        } else {
            throw new Error(data.message || 'Failed to generate speech');
        }
        
    } catch (error) {
        console.error('TTS Generation Error:', error);
        showNotification(`❌ Failed to generate speech: ${error.message}`, 'error');
    }
}

// Clear text function
function clearText() {
    const textArea = document.getElementById('customText');
    if (textArea) {
        textArea.value = '';
        updateCharacterCount();
        adjustTextareaHeight();
    }
    
    const audioSection = document.getElementById('audioSection');
    if (audioSection) {
        audioSection.style.display = 'none';
    }
    
    showNotification('🗑️ Text cleared', 'info');
}

// Show notifications (simplified version)
function showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg transform transition-all duration-500 translate-x-full max-w-sm ${
        type === 'success' 
            ? 'bg-green-600 text-white' 
            : type === 'error'
            ? 'bg-red-600 text-white'
            : type === 'warning'
            ? 'bg-yellow-600 text-white'
            : 'bg-blue-600 text-white'
    }`;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 500);
    }, 3000);
}
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

function adjustTextareaHeight() {
    const textArea = document.getElementById('customText');
    textArea.style.height = 'auto';
    textArea.style.height = Math.max(160, textArea.scrollHeight) + 'px';
}

function setupRangeSliders() {
    // Style range sliders
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        slider.style.background = `linear-gradient(to right, #3b82f6 0%, #3b82f6 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 100%)`;
    });
}

function updateSpeedDisplay(value) {
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

function updatePitchDisplay(value) {
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

async function generateSpeech() {
    console.log('Generate speech button clicked!');
    const textArea = document.getElementById('customText');
    const text = textArea.value.trim();
    console.log('Text to generate:', text);

    if (!text) {
        showNotification('Please enter some text to generate speech', 'error');
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

    function displayAudioPlayer(audioUrl) {
        const audioSection = document.getElementById('audioSection');
        const audio = document.getElementById('generatedAudio');
        const downloadBtn = document.getElementById('downloadBtn');

        audio.src = audioUrl;
        downloadBtn.href = audioUrl;
        
        audioSection.classList.remove('hidden');
        audioSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function updateAudioInfo() {
        const audio = document.getElementById('generatedAudio');
        const lengthDisplay = document.getElementById('audioLength');
        
        if (audio.duration) {
            const minutes = Math.floor(audio.duration / 60);
            const seconds = Math.floor(audio.duration % 60);
            lengthDisplay.textContent = `Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    function clearText() {
        const textArea = document.getElementById('customText');
        const audioSection = document.getElementById('audioSection');
        
        textArea.value = '';
        this.updateCharacterCount();
        this.adjustTextareaHeight();
        audioSection.classList.add('hidden');
        
        this.showNotification('Text cleared', 'info');
    }

    function showNotification(message, type = 'info') {
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
