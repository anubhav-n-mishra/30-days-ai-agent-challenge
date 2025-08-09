// Voice Agent JavaScript with Enhanced Interactions

// Modern notification system with updated colors
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl transform transition-all duration-500 translate-x-full backdrop-blur-sm border ${
        type === 'success' 
            ? 'bg-gradient-to-r from-emerald-600/90 to-green-600/90 text-white border-emerald-500/30' 
            : type === 'info'
            ? 'bg-gradient-to-r from-blue-600/90 to-cyan-600/90 text-white border-blue-500/30'
            : 'bg-gradient-to-r from-red-600/90 to-rose-600/90 text-white border-red-500/30'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
                ${type === 'success' 
                    ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                    : type === 'info'
                    ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                    : '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                }
            </div>
            <div class="font-medium">${message}</div>
        </div>
    `;
    
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Day 3: Generate custom speech from user input
function generateCustomSpeech() {
    console.log('Generate speech button clicked!');
    const textInput = document.getElementById('ttsText');
    const submitButton = document.getElementById('submitTTS');
    const audioSection = document.getElementById('audioSection');
    const audioElement = document.getElementById('ttsAudio');
    const downloadBtn = document.getElementById('downloadBtn');
    
    const userText = textInput.value;
    const trimmedText = userText.trim();
    console.log('Text to generate:', userText);
    
    if (!trimmedText) {
        showNotification('⚠️ Please enter some text to convert to speech!', 'error');
        textInput.focus();
        return;
    }

    if (userText.length > 5000) {
        showNotification('⚠️ Text is too long. Maximum 5000 characters allowed.', 'error');
        return;
    }
    
    // Get voice settings
    const voiceId = document.getElementById('voiceSelect').value;
    const speed = document.getElementById('speedRange').value;
    const pitch = document.getElementById('pitchRange').value;
    
    // Button loading state
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = `
        <svg class="animate-spin w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Generating...
    `;
    submitButton.disabled = true;
    
    // Hide previous audio if any
    audioSection.classList.add('hidden');
    
    fetch('/tts/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: userText,
            voice_id: voiceId,
            rate: speed,
            pitch: pitch
        })
    })
    .then(response => response.json())
    .then(data => {
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
        
        if (data.success && data.audio_url) {
            // Show success notification
            showNotification('🎉 Speech generated successfully! Audio player ready below.', 'success');
            
            // Update audio player
            audioElement.src = data.audio_url;
            downloadBtn.href = data.audio_url;
            audioSection.classList.remove('hidden');
            
            // Scroll to audio player
            audioSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add some visual flair
            createParticleEffect();
            
            // Auto play the audio after a short delay
            setTimeout(() => {
                audioElement.play().catch(error => {
                    console.log('Auto-play prevented by browser policy');
                });
            }, 500);
            
        } else {
            showNotification('⚠️ TTS generation failed. Please try again.', 'error');
        }
    })
    .catch(error => {
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
        
        console.error('TTS Error:', error);
        showNotification('🔧 Network error. Please check your connection and try again.', 'error');
    });
}

// Clear text input
function clearText() {
    const textInput = document.getElementById('ttsText');
    const audioSection = document.getElementById('audioSection');
    
    textInput.value = '';
    audioSection.classList.add('hidden');
    textInput.focus();
    
    showNotification('📝 Text cleared!', 'info');
}

// Enhanced greet function (keeping for backward compatibility)
function greet() {
    const button = document.querySelector('button[onclick="greet()"]');
    const originalText = button.innerHTML;
    
    // Button loading state
    button.innerHTML = `
        <svg class="animate-spin w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Generating Speech...
    `;
    button.disabled = true;
    
    // Test the TTS API
    const testText = "Hello! Welcome to Day 2 of the 30 Days Voice Agent challenge. This voice is generated using our new TTS API integration with Murf!";
    
    fetch('/tts/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: testText,
            voice_id: 'en-US-ken',
            rate: '0',
            pitch: '0'
        })
    })
    .then(response => response.json())
    .then(data => {
        button.innerHTML = originalText;
        button.disabled = false;
        
        if (data.success && data.audio_url) {
            // Show success notification with audio player
            showNotificationWithAudio('🎉 Speech generated successfully! Click to play audio.', 'success', data.audio_url);
            
            // Add some visual flair
            createParticleEffect();
            
            // Play a subtle sound effect
            playActivationSound();
        } else {
            showNotification('⚠️ TTS generation failed. Please check your API configuration.', 'error');
        }
    })
    .catch(error => {
        button.innerHTML = originalText;
        button.disabled = false;
        
        console.error('TTS Error:', error);
        showNotification('🔧 TTS API not configured. Visit /docs to test the endpoint manually.', 'info');
        
        // Still show the particle effect
        createParticleEffect();
    });
}

// Enhanced notification with audio player
function showNotificationWithAudio(message, type = 'success', audioUrl = null) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl transform transition-all duration-500 translate-x-full backdrop-blur-sm border max-w-sm ${
        type === 'success' 
            ? 'bg-gradient-to-r from-emerald-600/90 to-green-600/90 text-white border-emerald-500/30' 
            : type === 'info'
            ? 'bg-gradient-to-r from-blue-600/90 to-cyan-600/90 text-white border-blue-500/30'
            : 'bg-gradient-to-r from-red-600/90 to-rose-600/90 text-white border-red-500/30'
    }`;
    
    const audioPlayer = audioUrl ? `
        <div class="mt-3 pt-3 border-t border-white/20">
            <audio controls class="w-full" style="height: 32px;">
                <source src="${audioUrl}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>
            <div class="text-xs text-white/80 mt-1">Generated by Murf TTS API</div>
        </div>
    ` : '';
    
    notification.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 mt-0.5">
                ${type === 'success' 
                    ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                    : type === 'info'
                    ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                    : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                }
            </div>
            <div class="flex-1">
                <div class="font-medium text-sm">${message}</div>
                ${audioPlayer}
            </div>
            <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-white/60 hover:text-white transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto-remove after longer time for audio notifications
    const removeTime = audioUrl ? 10000 : 4000;
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentElement) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }
    }, removeTime);
}

// Create particle effect on activation with updated colors
function createParticleEffect() {
    const colors = ['#3B82F6', '#06B6D4', '#64748B', '#1E293B', '#0EA5E9'];
    const particleCount = 25;
    
    for (let i = 0; i < particleCount; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.className = 'fixed w-2 h-2 rounded-full pointer-events-none z-40';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.left = '50%';
            particle.style.top = '50%';
            particle.style.transform = 'translate(-50%, -50%)';
            particle.style.boxShadow = `0 0 10px ${colors[Math.floor(Math.random() * colors.length)]}40`;
            
            document.body.appendChild(particle);
            
            // Animate particle
            const angle = (Math.PI * 2 * i) / particleCount;
            const velocity = 120 + Math.random() * 80;
            const duration = 1200 + Math.random() * 800;
            
            particle.animate([
                { 
                    transform: 'translate(-50%, -50%) scale(1)', 
                    opacity: 1 
                },
                { 
                    transform: `translate(${Math.cos(angle) * velocity - 50}%, ${Math.sin(angle) * velocity - 50}%) scale(0)`, 
                    opacity: 0 
                }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).addEventListener('finish', () => {
                document.body.removeChild(particle);
            });
            
        }, i * 30);
    }
}

// Play activation sound (Web Audio API)
function playActivationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a pleasant activation sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.exponentialRampToValueAtTime(783.99, audioContext.currentTime + 0.1); // G5
        oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioContext.currentTime + 0.2); // C6
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        // Silently fail if audio is not supported
        console.log('Audio not supported');
    }
}

// Add smooth scrolling and intersection observer for animations
document.addEventListener('DOMContentLoaded', function() {
    // Add entrance animation
    const mainContent = document.querySelector('.glass-effect');
    mainContent.style.opacity = '0';
    mainContent.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
        mainContent.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';
    }, 300);
    
    // Add hover effects to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05) translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1) translateY(0)';
        });
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space' && event.target.tagName !== 'INPUT') {
            event.preventDefault();
            greet();
        }
    });
    
    // Add a subtle typing indicator
    showTypingIndicator();
    
    // Initialize voice controls if they exist
    initializeVoiceControls();
});

// Show typing indicator on load
function showTypingIndicator() {
    setTimeout(() => {
        showNotification('🎙️ Day 3: Voice Agent with Advanced TTS Features!', 'info');
    }, 2000);
}

// Initialize voice controls and character counter
function initializeVoiceControls() {
    const textArea = document.getElementById('ttsText');
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
    const textArea = document.getElementById('ttsText');
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
    const textArea = document.getElementById('ttsText');
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

// Generate TTS audio with enhanced UI feedback
async function generateTTS() {
    const textArea = document.getElementById('ttsText');
    const voiceSelect = document.getElementById('voiceSelect');
    const speedRange = document.getElementById('speedRange');
    const pitchRange = document.getElementById('pitchRange');
    const audioPlayer = document.getElementById('audioPlayer');
    const downloadBtn = document.getElementById('downloadBtn');
    
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

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Set up audio player
        if (audioPlayer) {
            audioPlayer.src = audioUrl;
            audioPlayer.style.display = 'block';
            
            // Setup download functionality
            if (downloadBtn) {
                downloadBtn.onclick = () => {
                    const a = document.createElement('a');
                    a.href = audioUrl;
                    a.download = `tts-audio-${Date.now()}.mp3`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    showNotification('📥 Audio downloaded!', 'success');
                };
                downloadBtn.style.display = 'inline-flex';
            }
        }
        
        showNotification('🎉 Speech generated successfully!', 'success');
        
    } catch (error) {
        console.error('TTS Generation Error:', error);
        showNotification(`❌ Failed to generate speech: ${error.message}`, 'error');
    }
}

// ============================================
// DAY 4: ECHO BOT FUNCTIONALITY
// ============================================

let mediaRecorder;
let audioChunks = [];
let recordingTimer;
let recordingStartTime;
let recordingStream;

// Initialize Echo Bot when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateEchoBotStatus('Ready to record');
    
    // Ensure button event handlers are properly attached
    const startBtn = document.getElementById('startRecordBtn');
    const stopBtn = document.getElementById('stopRecordBtn');
    const clearBtn = document.getElementById('clearRecordBtn');
    
    console.log('Setting up button event listeners...');
    
    if (startBtn) {
        console.log('Start button found, adding event listener');
        // Remove any existing onclick and add event listener
        startBtn.onclick = null;
        startBtn.addEventListener('click', () => {
            console.log('Start button clicked via event listener');
            startRecording();
        });
        
        // Also keep the onclick for backup
        startBtn.onclick = () => {
            console.log('Start button clicked via onclick');
            startRecording();
        };
    } else {
        console.error('Start button not found!');
    }
    
    if (stopBtn) {
        console.log('Stop button found');
        stopBtn.onclick = () => {
            console.log('Stop button clicked');
            stopRecording();
        };
    }
    
    if (clearBtn) {
        console.log('Clear button found');  
        clearBtn.onclick = () => {
            console.log('Clear button clicked');
            clearRecording();
        };
    }
    
    // Add debug function to window for console testing
    window.debugRecording = function() {
        console.log('=== RECORDING DEBUG INFO ===');
        console.log('MediaRecorder support:', typeof MediaRecorder !== 'undefined');
        console.log('getUserMedia support:', !!navigator.mediaDevices?.getUserMedia);
        console.log('Current mediaRecorder:', mediaRecorder);
        console.log('Current recordingStream:', recordingStream);
        console.log('Current audioChunks:', audioChunks);
        
        console.log('Start button:', startBtn);
        console.log('Stop button:', stopBtn);
        console.log('Start button onclick:', startBtn?.onclick);
        console.log('Start button disabled:', startBtn?.disabled);
        
        if (mediaRecorder) {
            console.log('MediaRecorder state:', mediaRecorder.state);
        }
        console.log('========================');
    };
    
    // Add manual start function for testing
    window.testStartRecording = function() {
        console.log('Manual start recording test...');
        startRecording();
    };
    
    console.log('Page loaded. Button handlers set up.');
    console.log('Call debugRecording() or testStartRecording() in console for testing.');
});

// Start recording function
async function startRecording() {
    console.log('=== START RECORDING CALLED ===');
    
    // Check if already recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log('Already recording, ignoring call');
        return;
    }
    
    try {
        console.log('Step 1: Checking browser support...');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Browser does not support audio recording');
        }
        
        console.log('Step 2: Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true
        });
        
        console.log('Step 3: Microphone access granted');
        recordingStream = stream;
        
        console.log('Step 4: Creating MediaRecorder...');
        // Use simple MediaRecorder without specific codec
        mediaRecorder = new MediaRecorder(stream);
        
        console.log('Step 5: Setting up event handlers...');
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            console.log('Data available:', event.data.size);
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstart = () => {
            console.log('Recording STARTED successfully!');
        };
        
        mediaRecorder.onstop = () => {
            console.log('Recording STOPPED');
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            // Update status
            updateEchoBotStatus('Recording complete! Processing with AI voice...');
            
            // Stop all tracks
            if (recordingStream) {
                recordingStream.getTracks().forEach(track => track.stop());
            }
            
            showNotification('🎤 Recording saved! Processing with AI voice...', 'success');
            
            // Process with Echo Bot v2
            processEchoBotV2(audioBlob);
        };
        
        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            showNotification(`❌ Recording error: ${event.error.message}`, 'error');
        };
        
        console.log('Step 6: Starting recording...');
        mediaRecorder.start();
        
        console.log('Step 7: Updating UI...');
        recordingStartTime = Date.now();
        updateRecordingUI(true);
        updateEchoBotStatus('🔴 Recording in progress...', true);
        startRecordingTimer();
        
        showNotification('🔴 Recording started! Speak into your microphone.', 'info');
        console.log('=== RECORDING SETUP COMPLETE ===');
        
    } catch (error) {
        console.error('=== RECORDING FAILED ===');
        console.error('Error:', error);
        
        let errorMessage = 'Failed to start recording: ';
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Microphone access denied. Please allow microphone access.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'No microphone found. Please check your audio devices.';
        } else {
            errorMessage += error.message;
        }
        
        showNotification(`❌ ${errorMessage}`, 'error');
        updateEchoBotStatus('❌ Failed to start recording');
        
        // Clean up
        if (recordingStream) {
            recordingStream.getTracks().forEach(track => track.stop());
            recordingStream = null;
        }
        mediaRecorder = null;
    }
}

// Stop recording function
function stopRecording() {
    console.log('Stopping recording...');
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        
        // Update UI
        updateRecordingUI(false);
        stopRecordingTimer();
        
        showNotification('⏹️ Recording stopped. Processing audio...', 'info');
    }
}

// Clear recording function
function clearRecording() {
    console.log('Clearing recording...');
    
    // Stop recording if in progress
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    }
    
    // Clear audio chunks
    audioChunks = [];
    
    // Reset UI
    const echoAudio = document.getElementById('echoAudio');
    const playbackSection = document.getElementById('playbackSection');
    
    if (echoAudio) {
        echoAudio.src = '';
        echoAudio.load();
    }
    
    if (playbackSection) {
        playbackSection.classList.add('hidden');
    }
    
    // Reset status
    updateEchoBotStatus('Ready to record');
    updateRecordingUI(false);
    
    showNotification('🗑️ Recording cleared. Ready for a new recording.', 'info');
}

// Play echo function
function playEcho() {
    const echoAudio = document.getElementById('echoAudio');
    
    if (echoAudio && echoAudio.src) {
        echoAudio.play().then(() => {
            showNotification('▶️ Playing your echo recording!', 'success');
        }).catch(error => {
            console.error('Error playing audio:', error);
            showNotification('❌ Error playing audio. Please try again.', 'error');
        });
    } else {
        showNotification('❌ No recording found. Please record something first.', 'error');
    }
}

// Update recording UI
function updateRecordingUI(isRecording) {
    console.log('updateRecordingUI called with isRecording:', isRecording);
    
    const startBtn = document.getElementById('startRecordBtn');
    const stopBtn = document.getElementById('stopRecordBtn');
    const clearBtn = document.getElementById('clearRecordBtn');
    
    console.log('Buttons found:', {
        startBtn: !!startBtn,
        stopBtn: !!stopBtn, 
        clearBtn: !!clearBtn
    });
    
    if (startBtn && stopBtn && clearBtn) {
        startBtn.disabled = isRecording;
        stopBtn.disabled = !isRecording;
        clearBtn.disabled = isRecording;
        
        console.log('Button states set:', {
            startDisabled: startBtn.disabled,
            stopDisabled: stopBtn.disabled,
            clearDisabled: clearBtn.disabled
        });
        
        // Update button styles
        if (isRecording) {
            startBtn.classList.add('opacity-50', 'cursor-not-allowed');
            stopBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            clearBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            stopBtn.classList.add('opacity-50', 'cursor-not-allowed');
            clearBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    } else {
        console.error('One or more buttons not found!');
    }
}

// Update echo bot status
function updateEchoBotStatus(message, isRecording = false) {
    const statusText = document.getElementById('statusText');
    const micIcon = document.getElementById('micIcon');
    
    if (statusText) {
        statusText.textContent = message;
    }
    
    if (micIcon) {
        if (isRecording) {
            micIcon.classList.add('text-red-500', 'animate-pulse');
            micIcon.classList.remove('text-slate-400');
        } else {
            micIcon.classList.remove('text-red-500', 'animate-pulse');
            micIcon.classList.add('text-slate-400');
        }
    }
}

// Recording timer
function startRecordingTimer() {
    const timerElement = document.getElementById('recordingTimer');
    if (!timerElement) return;
    
    timerElement.classList.remove('hidden');
    
    recordingTimer = setInterval(() => {
        const elapsed = Date.now() - recordingStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopRecordingTimer() {
    const timerElement = document.getElementById('recordingTimer');
    
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    
    if (timerElement) {
        timerElement.classList.add('hidden');
        timerElement.textContent = '00:00';
    }
}

// DAY 5: Upload audio file to server
async function uploadAudioToServer(audioBlob) {
    console.log('Uploading audio to server...');
    
    // Update status to show upload in progress
    updateEchoBotStatus('📤 Uploading recording to server...', true);
    
    try {
        // Create FormData to send the audio file
        const formData = new FormData();
        const timestamp = Date.now();
        const filename = `echo-recording-${timestamp}.webm`;
        
        // Append the audio blob as a file
        formData.append('file', audioBlob, filename);
        
        // Make the upload request
        const response = await fetch('/upload-audio', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Upload successful:', result);
            
            // Show success notification with file details
            const fileSize = (result.size / 1024).toFixed(1); // Convert to KB
            const uploadMessage = `✅ Upload successful! File: ${result.filename} (${fileSize} KB, ${result.content_type})`;
            
            showNotification(uploadMessage, 'success');
            updateEchoBotStatus('✅ Recording uploaded successfully! Play it back below.');
            
        } else {
            const errorData = await response.json();
            console.error('Upload failed:', errorData);
            
            showNotification(`❌ Upload failed: ${errorData.detail || 'Unknown error'}`, 'error');
            updateEchoBotStatus('❌ Upload failed. Recording saved locally.');
        }
        
    } catch (error) {
        console.error('Network error during upload:', error);
        showNotification(`❌ Network error: ${error.message}`, 'error');
        updateEchoBotStatus('❌ Upload failed due to network error. Recording saved locally.');
    }
}

// DAY 6: Transcribe audio file using AssemblyAI
async function transcribeAudioFile(audioBlob) {
    console.log('Transcribing audio file...');
    
    // Show transcription section and update status
    const transcriptionSection = document.getElementById('transcriptionSection');
    const transcriptionStatus = document.getElementById('transcriptionStatus');
    const transcriptionResult = document.getElementById('transcriptionResult');
    const transcriptionText = document.getElementById('transcriptionText');
    
    if (transcriptionSection) {
        transcriptionSection.classList.remove('hidden');
    }
    
    if (transcriptionStatus) {
        transcriptionStatus.innerHTML = `
            <div class="flex items-center justify-center space-x-2">
                <svg class="animate-spin w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span class="text-purple-400">Transcribing audio with AI...</span>
            </div>
        `;
    }
    
    try {
        // Create FormData to send the audio file
        const formData = new FormData();
        const timestamp = Date.now();
        const filename = `transcription-audio-${timestamp}.webm`;
        
        // Append the audio blob as a file
        formData.append('file', audioBlob, filename);
        
        // Make the transcription request
        const response = await fetch('/transcribe/file', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Transcription successful:', result);
            
            if (result.success && result.transcript) {
                // Show success notification
                showNotification('🎯 Audio transcribed successfully!', 'success');
                
                // Display transcription result
                if (transcriptionStatus) {
                    transcriptionStatus.innerHTML = `
                        <div class="flex items-center justify-center space-x-2">
                            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span class="text-green-400">Transcription completed successfully!</span>
                        </div>
                    `;
                }
                
                if (transcriptionText) {
                    transcriptionText.textContent = result.transcript;
                }
                
                if (transcriptionResult) {
                    transcriptionResult.classList.remove('hidden');
                    transcriptionResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
            } else {
                throw new Error('No transcript received from server');
            }
            
        } else {
            const errorData = await response.json();
            console.error('Transcription failed:', errorData);
            
            throw new Error(errorData.detail || 'Transcription service unavailable');
        }
        
    } catch (error) {
        console.error('Transcription error:', error);
        
        // Show error notification
        showNotification(`❌ Transcription failed: ${error.message}`, 'error');
        
        // Update status to show error
        if (transcriptionStatus) {
            transcriptionStatus.innerHTML = `
                <div class="flex items-center justify-center space-x-2">
                    <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="text-red-400">Transcription failed. Please try again.</span>
                </div>
            `;
        }
    }
}

// Process audio with Echo Bot v2 (transcription + TTS)
async function processEchoBotV2(audioBlob) {
    const echoSection = document.getElementById('playbackSection'); // Fixed: changed from 'echoSection' to 'playbackSection'
    const audioPlayback = document.getElementById('echoAudio'); // Fixed: changed from 'audioPlayback' to 'echoAudio'
    const transcriptionResult = document.getElementById('transcriptionResult');
    const transcriptionText = document.getElementById('transcriptionText');
    
    console.log('processEchoBotV2 - Elements found:', {
        echoSection: !!echoSection,
        audioPlayback: !!audioPlayback,
        transcriptionResult: !!transcriptionResult,
        transcriptionText: !!transcriptionText
    });
    
    try {
        // Show processing status
        updateEchoBotStatus('🎙️ Transcribing your voice...');
        
        // Create FormData to send audio file
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        
        // Send to Echo Bot v2 endpoint
        showNotification('🤖 Processing with AI voice transformation...', 'info');
        const response = await fetch('/tts/echo', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            // Update status for TTS generation
            updateEchoBotStatus('🗣️ Generating AI voice response...');
            
            const data = await response.json();
            
            // Display transcription
            if (data.transcription) {
                transcriptionText.textContent = data.transcription;
                transcriptionResult.classList.remove('hidden');
                transcriptionResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            // Play TTS audio
            if (data.audio_url) {
                updateEchoBotStatus('✅ AI voice ready! Playing back...');
                
                // Set audio source and play
                audioPlayback.src = data.audio_url;
                audioPlayback.load(); // Reload audio element
                
                try {
                    await audioPlayback.play();
                    showNotification('🎉 Echo Bot v2 transformation complete!', 'success');
                    
                    // Show playback section
                    echoSection.classList.remove('hidden');
                    echoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                } catch (playError) {
                    console.error('Audio playback error:', playError);
                    showNotification('Audio generated but playback failed. Check your browser settings.', 'warning');
                    updateEchoBotStatus('✅ Voice transformation complete! Click play to listen.');
                }
                
            } else {
                throw new Error('No audio URL received from TTS service');
            }
            
        } else {
            const errorData = await response.json();
            console.error('Echo Bot v2 processing failed:', errorData);
            console.error('Response status:', response.status);
            console.error('Response statusText:', response.statusText);
            throw new Error(errorData.detail || errorData.message || `Server error: ${response.status} ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('Echo Bot v2 error:', error);
        console.error('Error type:', typeof error);
        console.error('Error message:', error.message);
        console.error('Full error object:', error);
        
        // Show error notification
        let errorMessage = 'Voice transformation failed';
        if (error.message && error.message !== '[object Object]') {
            errorMessage += `: ${error.message}`;
        }
        showNotification(`❌ ${errorMessage}`, 'error');
        
        // Update status to show error
        updateEchoBotStatus(`❌ Processing failed: ${error.message || 'Unknown error'}`);
    }
}

// Keyboard shortcuts for Echo Bot
document.addEventListener('keydown', function(event) {
    // Space bar to start/stop recording (when not focused on input)
    if (event.code === 'Space' && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    }
    
    // Escape to clear recording
    if (event.code === 'Escape') {
        clearRecording();
    }
});

// Check browser compatibility on load
document.addEventListener('DOMContentLoaded', function() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('❌ Your browser does not support audio recording. Please use a modern browser.', 'error');
        
        // Disable recording buttons
        const startBtn = document.getElementById('startRecordBtn');
        const stopBtn = document.getElementById('stopRecordBtn');
        
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.textContent = 'Not Supported';
        }
        
        if (stopBtn) {
            stopBtn.disabled = true;
        }
    }
});
