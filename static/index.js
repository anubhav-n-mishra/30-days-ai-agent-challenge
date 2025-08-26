document.addEventListener("DOMContentLoaded", () => {
    let audioContext = null;
    let source = null;
    let processor = null;
    let isRecording = false;
    let socket = null;
    let heartbeatInterval = null;

    let audioQueue = [];
    let isPlaying = false;
    let currentAiMessageContentElement = null;
    let audioChunkIndex = 0;
    
    // NEW: Keep a reference to the current audio source to stop it gracefully
    let currentAudioSource = null; 

    const recordBtn = document.getElementById("recordBtn");
    // Persona/voice dropdown removed; always use Lelouch persona
    const statusDisplay = document.getElementById("statusDisplay");
    const chatDisplay = document.getElementById("chatDisplay");
    const chatContainer = document.getElementById("chatContainer");
    const clearBtnContainer = document.getElementById("clearBtnContainer");
    const clearBtn = document.getElementById("clearBtn");

    // MODIFIED: This function now stops the specific sound source instead of destroying the context.
    const stopCurrentPlayback = () => {
    console.log("🤫 Lelouch AI: Oops, you interrupted me! Stopping my current response.");
        if (currentAudioSource) {
            currentAudioSource.stop();
            currentAudioSource = null;
        }
        audioQueue = []; 
        isPlaying = false;
    };

    const playNextChunk = () => {
        if (!audioQueue.length || !audioContext || audioContext.state === "closed") {
            if (isPlaying) {
                console.log("✅ Lelouch AI: That's everything from me for now! All audio chunks have been played.");
            }
            isPlaying = false;
            currentAudioSource = null;
            return;
        }
        
    console.log(`➡️ Lelouch AI: Playing audio chunk. ${audioQueue.length - 1} remaining in the queue.`);
        isPlaying = true;
        const chunk = audioQueue.shift(); 
        
        audioContext.decodeAudioData(chunk,
            (buffer) => {
                const sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = buffer;
                sourceNode.connect(audioContext.destination);
                sourceNode.start();

                // MODIFIED: Store reference to the new source and clear it onended
                currentAudioSource = sourceNode;
                sourceNode.onended = () => {
                    currentAudioSource = null;
                    playNextChunk();
                };
            },
            (error) => {
                console.error("Error decoding audio data:", error);
                playNextChunk();
            }
        );
    };

    const cleanupResources = () => {
        console.log("🧹 Cleaning up all resources...");
        
        // Clear heartbeat
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        
        // Stop current audio playback
        stopCurrentPlayback();
        
        // Clean up media stream
        if (source && source.mediaStream) {
            source.mediaStream.getTracks().forEach(track => {
                track.stop();
                console.log("🛑 Stopped media track:", track.kind);
            });
        }
        
        // Clean up audio nodes
        if (processor) {
            try {
                processor.disconnect();
            } catch (e) {
                console.warn("Error disconnecting processor:", e);
            }
            processor = null;
        }
        
        if (source) {
            try {
                source.disconnect();
            } catch (e) {
                console.warn("Error disconnecting source:", e);
            }
            source = null;
        }
        
        // Clean up WebSocket
        if (socket) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
            socket = null;
        }
        
        // Reset states
        isRecording = false;
        currentAiMessageContentElement = null;
    };

    const startRecording = async () => {
        console.log("🎤 Starting fresh recording session...");
        statusDisplay.textContent = "Connecting...";
        statusDisplay.classList.remove("text-red-400");
        
        // Clean up any existing resources first
        cleanupResources();
        
        // Initialize AudioContext
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                alert("Web Audio API is not supported in this browser.");
                console.error("Error creating AudioContext", e);
                return;
            }
        }
        
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            alert("Audio recording is not supported in this browser.");
            return;
        }

        try {
            // Create WebSocket with connection timeout
            const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);
            
            // Set connection timeout
            const connectionTimeout = setTimeout(() => {
                if (socket && socket.readyState !== WebSocket.OPEN) {
                    socket.close();
                    statusDisplay.textContent = "Connection timeout. Click to retry.";
                    statusDisplay.classList.add("text-red-400");
                }
            }, 10000);

            socket.onopen = async () => {
                clearTimeout(connectionTimeout);
                console.log("🔌 WebSocket connection established successfully!");
                
                // Set up heartbeat
                heartbeatInterval = setInterval(() => {
                    if (socket?.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: "ping" }));
                    } else {
                        clearInterval(heartbeatInterval);
                        heartbeatInterval = null;
                    }
                }, 25000);

                try {
                    // Get media stream
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    source = audioContext.createMediaStreamSource(stream);
                    processor = audioContext.createScriptProcessor(4096, 1, 1);

                    processor.onaudioprocess = (event) => {
                        if (!socket || socket.readyState !== WebSocket.OPEN) return;
                        
                        const inputData = event.inputBuffer.getChannelData(0);
                        const targetSampleRate = 16000;
                        const sourceSampleRate = audioContext.sampleRate;
                        const ratio = sourceSampleRate / targetSampleRate;
                        const newLength = Math.floor(inputData.length / ratio);
                        const downsampledData = new Float32Array(newLength);
                        
                        for (let i = 0; i < newLength; i++) {
                            downsampledData[i] = inputData[Math.floor(i * ratio)];
                        }
                        
                        const pcmData = new Int16Array(downsampledData.length);
                        for (let i = 0; i < pcmData.length; i++) {
                            const sample = Math.max(-1, Math.min(1, downsampledData[i]));
                            pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                        }
                        
                        socket.send(pcmData.buffer);
                    };

                    source.connect(processor);
                    processor.connect(audioContext.destination);
                    
                    // Mark as recording
                    isRecording = true;
                    updateUIForRecording(true);
                    statusDisplay.textContent = "Ready";
                    
                } catch (micError) {
                    console.error("Microphone access error:", micError);
                    alert("Could not access the microphone. Please check your browser permissions.");
                    cleanupResources();
                    updateUIForRecording(false);
                    return;
                }
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type !== 'audio' && data.type !== 'pong') {
                        console.log(`📬 Message from server -> Type: ${data.type}`, data);
                    }

                    switch (data.type) {
                        case "pong":
                            break;
                        case "status":
                            statusDisplay.textContent = data.message;
                            break;
                        case "transcription":
                            if (data.end_of_turn && data.text) {
                                addToChatLog(data.text, 'user');
                                statusDisplay.textContent = "Lelouch AI is thinking...";
                                currentAiMessageContentElement = null;
                            }
                            break;
                        case "llm_chunk":
                            if (data.data) {
                                if (!currentAiMessageContentElement) {
                                    currentAiMessageContentElement = addToChatLog("", 'ai');
                                }
                                // Accumulate the text content
                                let currentText = currentAiMessageContentElement.getAttribute('data-raw-text') || '';
                                currentText += data.data;
                                currentAiMessageContentElement.setAttribute('data-raw-text', currentText);
                                
                                // Render markdown
                                currentAiMessageContentElement.innerHTML = marked.parse(currentText);
                                chatContainer.scrollTop = chatContainer.scrollHeight;
                            }
                            break;
                        case "audio_start":
                            statusDisplay.textContent = "Receiving audio response...";
                            console.log("🎶 Lelouch AI: Okay, I've started receiving the audio stream. Getting ready to speak!");
                            
                            if (audioContext.state === 'suspended') {
                                audioContext.resume();
                            }
                            
                            audioQueue = [];
                            audioChunkIndex = 0;
                            break;
                        case "audio_interrupt":
                            stopCurrentPlayback();
                            statusDisplay.textContent = "Interrupted. Listening...";
                            break;
                        case "audio": {
                            if (data.data) {
                                const audioData = atob(data.data);
                                const byteNumbers = new Array(audioData.length);
                                for (let i = 0; i < audioData.length; i++) {
                                    byteNumbers[i] = audioData.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                
                                console.log(`🎵 Lelouch AI: Processing audio chunk ${audioChunkIndex + 1}. Size: ${byteArray.buffer.byteLength} bytes. Queueing it up!`);
                                audioChunkIndex++;
                                
                                audioQueue.push(byteArray.buffer);
                                
                                if (!isPlaying) {
                                    console.log(`▶️ Lelouch AI: Let's play the first chunk! I have ${audioQueue.length} pieces of my response ready.`);
                                    playNextChunk();
                                }
                            }
                            break;
                        }
                        case "audio_end":
                            statusDisplay.textContent = "Audio playback finished.";
                            console.log("🏁 Lelouch AI: The server has confirmed the audio stream is complete.");
                            break;
                        case "error":
                            statusDisplay.textContent = `Error: ${data.message}`;
                            statusDisplay.classList.add("text-red-400");
                            break;
                    }
                } catch (err) { console.error("Error parsing message:", err); }
            };

            socket.onclose = (event) => {
                console.log("💔 Connection closed:", event.code, event.reason);
                statusDisplay.textContent = "Connection closed. Click microphone to reconnect.";
                cleanupResources();
                updateUIForRecording(false);
                
                setTimeout(() => {
                    if (!isRecording) {
                        statusDisplay.textContent = "Ready to reconnect";
                        statusDisplay.classList.remove("text-red-400");
                    }
                }, 1500);
            };
            
            socket.onerror = (error) => {
                console.error("WebSocket Error:", error);
                statusDisplay.textContent = "Connection error. Click microphone to retry.";
                statusDisplay.classList.add("text-red-400");
                cleanupResources();
                updateUIForRecording(false);
            };

        } catch (err) {
            console.error("Failed to start recording session:", err);
            statusDisplay.textContent = "Failed to start. Click to retry.";
            statusDisplay.classList.add("text-red-400");
            cleanupResources();
            updateUIForRecording(false);
        }
    };
    
    // MODIFIED: This function now only disconnects nodes, it does not destroy the AudioContext.
    const stopRecording = async (sendEOF = true) => {
        if (!isRecording) return;
        console.log("🛑 Lelouch AI: Recording stopped. Cleaning up connection...");
        
        isRecording = false;
        stopCurrentPlayback();

        // Clean up heartbeat
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }

        // Disconnect audio processing nodes
        if (processor) {
            processor.disconnect();
            processor = null;
        }
        if (source) {
            source.disconnect();
            source = null;
        }
        
        // Stop media stream tracks
        if (recordBtn.mediaStream) {
            recordBtn.mediaStream.getTracks().forEach(track => track.stop());
            recordBtn.mediaStream = null;
        }
        
        // Close WebSocket connection cleanly
        if (socket) {
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close(1000, "User stopped recording");
            }
            socket = null;
        }
        
        // Update UI
        updateUIForRecording(false);
        statusDisplay.textContent = "Ready to start new session";
        statusDisplay.classList.remove("text-red-400");
        
        console.log("✅ Lelouch AI: Cleanup complete. Ready for next session!");
    };

    const updateUIForRecording = (isRec) => {
        if (isRec) {
            recordBtn.classList.add("recording", "bg-red-600", "hover:bg-red-700");
            recordBtn.classList.remove("bg-violet-600", "hover:bg-violet-700");
            statusDisplay.textContent = "Connecting...";
            chatDisplay.classList.remove("hidden");
            clearBtnContainer.classList.add("hidden");
        } else {
            recordBtn.classList.remove("recording", "bg-red-600", "hover:bg-red-700");
            recordBtn.classList.add("bg-violet-600", "hover:bg-violet-700");
            statusDisplay.textContent = "Ready";
            statusDisplay.classList.remove("text-red-400");
        }
    };

    const addToChatLog = (text, sender) => {
        const messageElement = document.createElement("div");
        messageElement.className = 'chat-message';

        const prefixSpan = document.createElement('span');
        const contentSpan = document.createElement('span');
        contentSpan.className = 'message-content';

        if (sender === 'user') {
            prefixSpan.className = 'user-prefix';
            prefixSpan.textContent = 'You: ';
            contentSpan.textContent = text;
        } else {
            prefixSpan.className = 'ai-prefix';
            prefixSpan.textContent = 'Lelouch AI: ';
            contentSpan.className += ' markdown-content';
            if (text) {
                contentSpan.innerHTML = marked.parse(text);
            }
        }
        
        messageElement.appendChild(prefixSpan);
        messageElement.appendChild(contentSpan);
        chatContainer.appendChild(messageElement);

        if (chatContainer.children.length > 0) {
            clearBtnContainer.classList.remove("hidden");
        }
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        return contentSpan; 
    };

    clearBtn.addEventListener("click", () => {
        chatContainer.innerHTML = '';
        clearBtnContainer.classList.add("hidden");
    });

    recordBtn.addEventListener("click", () => {
        if (isRecording) {
            console.log("🛑 Stopping current recording session...");
            stopRecording();
        } else {
            console.log("🎤 Starting new recording session...");
            startRecording();
        }
    });

    window.addEventListener('beforeunload', () => {
        cleanupResources();
    });
});