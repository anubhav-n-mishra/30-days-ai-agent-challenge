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
    const textInput = document.getElementById('ttsText');
    const submitButton = document.getElementById('submitTTS');
    const audioSection = document.getElementById('audioSection');
    const audioElement = document.getElementById('ttsAudio');
    
    const userText = textInput.value;
    const trimmedText = userText.trim();
    
    if (!trimmedText) {
        showNotification('⚠️ Please enter some text to convert to speech!', 'error');
        textInput.focus();
        return;
    }
    
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
            voice_id: 'en-US-ken',
            rate: '0',
            pitch: '0'
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
});

// Show typing indicator on load
function showTypingIndicator() {
    setTimeout(() => {
        showNotification('🎙️ Day 2: Click to test TTS API or visit /docs for full documentation!', 'info');
    }, 2000);
}
