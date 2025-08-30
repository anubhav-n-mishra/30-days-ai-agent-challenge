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
    
    // API Keys storage
    let apiKeys = {
        gemini: '',
        assemblyai: '',
        murf: '',
        tavily: ''
    };
    
    // Supabase client
    const supabaseUrl = 'https://ujkjrntnbhhkaxuhwxhm.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqa2pybnRuYmhoa2F4dWh3eGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0ODM3OTYsImV4cCI6MjA3MjA1OTc5Nn0.98sfVBlhnLjicmBuZI-VG3YcoXvBj8fo42bqkQ4Tv20';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    let currentUser = null;
    let chatHistory = [];

    const recordBtn = document.getElementById("recordBtn");
    // Persona/voice dropdown removed; always use Lelouch persona
    const statusDisplay = document.getElementById("statusDisplay");
    const chatDisplay = document.getElementById("chatDisplay");
    const chatContainer = document.getElementById("chatContainer");
    const clearBtnContainer = document.getElementById("clearBtnContainer");
    const clearBtn = document.getElementById("clearBtn");
    const saveChatBtn = document.getElementById("saveChatBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginBtn = document.getElementById("loginBtn");
    const userInfo = document.getElementById("userInfo");
    
    // Sidebar elements
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const toggleSidebar = document.getElementById("toggleSidebar");
    const closeSidebar = document.getElementById("closeSidebar");
    const sidebarLoading = document.getElementById("sidebarLoading");
    const sidebarHistory = document.getElementById("sidebarHistory");
    const sidebarEmpty = document.getElementById("sidebarEmpty");
    
    // API Modal elements
    const apiModal = document.getElementById("apiModal");
    const configBtn = document.getElementById("configBtn");
    const saveKeysBtn = document.getElementById("saveKeys");
    const cancelKeysBtn = document.getElementById("cancelKeys");
    const geminiKeyInput = document.getElementById("geminiKey");
    const assemblyaiKeyInput = document.getElementById("assemblyaiKey");
    const murfKeyInput = document.getElementById("murfKey");
    const tavilyKeyInput = document.getElementById("tavilyKey");

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
        
        // Validate chunk before processing
        if (!chunk || chunk.byteLength === 0) {
            console.warn("⚠️ Empty or invalid audio chunk, skipping...");
            playNextChunk();
            return;
        }
        
        // Ensure audio context is ready
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                decodeAndPlayChunk(chunk);
            }).catch(error => {
                console.error("Failed to resume audio context:", error);
                playNextChunk();
            });
        } else {
            decodeAndPlayChunk(chunk);
        }
    };
    
    const decodeAndPlayChunk = (chunk) => {
        // Create a copy of the ArrayBuffer to avoid detached buffer issues
        const chunkCopy = chunk.slice();
        
        audioContext.decodeAudioData(chunkCopy)
            .then((buffer) => {
                // Double-check that we still have a valid audio context
                if (!audioContext || audioContext.state === "closed") {
                    console.warn("Audio context closed, skipping playback");
                    playNextChunk();
                    return;
                }
                
                const sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = buffer;
                sourceNode.connect(audioContext.destination);
                
                // Store reference to the new source and clear it onended
                currentAudioSource = sourceNode;
                sourceNode.onended = () => {
                    currentAudioSource = null;
                    playNextChunk();
                };
                
                sourceNode.onerror = (error) => {
                    console.error("Audio source error:", error);
                    currentAudioSource = null;
                    playNextChunk();
                };
                
                try {
                    sourceNode.start();
                } catch (error) {
                    console.error("Failed to start audio source:", error);
                    currentAudioSource = null;
                    playNextChunk();
                }
            })
            .catch((error) => {
                console.error("Error decoding audio data:", error);
                console.warn("Skipping corrupted audio chunk and continuing...");
                playNextChunk();
            });
    };

    // API Key Management
    const showApiModal = () => {
        apiModal.classList.remove("hidden");
        // Load existing keys
        geminiKeyInput.value = apiKeys.gemini;
        assemblyaiKeyInput.value = apiKeys.assemblyai;
        murfKeyInput.value = apiKeys.murf;
        tavilyKeyInput.value = apiKeys.tavily;
    };
    
    const hideApiModal = () => {
        apiModal.classList.add("hidden");
    };
    
    const saveApiKeys = () => {
        apiKeys.gemini = geminiKeyInput.value.trim();
        apiKeys.assemblyai = assemblyaiKeyInput.value.trim();
        apiKeys.murf = murfKeyInput.value.trim();
        apiKeys.tavily = tavilyKeyInput.value.trim();
        
        // Check if required keys are provided
        if (!apiKeys.gemini || !apiKeys.assemblyai || !apiKeys.murf) {
            alert("Please provide at least Gemini, AssemblyAI, and Murf API keys to continue.");
            return;
        }
        
        // Enable the record button
        recordBtn.disabled = false;
        statusDisplay.textContent = "Ready";
        hideApiModal();
        
        // Store keys in sessionStorage for this session
        sessionStorage.setItem('apiKeys', JSON.stringify(apiKeys));
    };
    
    // Load API keys from sessionStorage if available
    const loadStoredKeys = () => {
        const stored = sessionStorage.getItem('apiKeys');
        if (stored) {
            apiKeys = JSON.parse(stored);
            if (apiKeys.gemini && apiKeys.assemblyai && apiKeys.murf) {
                recordBtn.disabled = false;
                statusDisplay.textContent = "Ready";
            }
        }
    };
    
    // Event listeners for API modal
    configBtn.addEventListener("click", showApiModal);
    saveKeysBtn.addEventListener("click", saveApiKeys);
    cancelKeysBtn.addEventListener("click", hideApiModal);
    
    // Authentication functions
    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const mobileUserInfo = document.getElementById('mobileUserInfo');
        const mobileLoginBtn = document.getElementById('mobileLoginBtn');
        const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
        
        if (!user) {
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            if (mobileLoginBtn) mobileLoginBtn.classList.remove('hidden');
            if (mobileLogoutBtn) mobileLogoutBtn.classList.add('hidden');
            userInfo.textContent = '';
            if (mobileUserInfo) mobileUserInfo.textContent = '';
            toggleSidebar.style.display = 'none';
            return false;
        }
        currentUser = user;
        userInfo.textContent = user.email;
        if (mobileUserInfo) mobileUserInfo.textContent = user.email;
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        if (mobileLoginBtn) mobileLoginBtn.classList.add('hidden');
        if (mobileLogoutBtn) mobileLogoutBtn.classList.remove('hidden');
        toggleSidebar.style.display = 'block';
        return true;
    };
    
    const saveChat = async () => {
        if (!currentUser || chatHistory.length === 0) {
            alert('No chat to save or user not logged in');
            return;
        }
        
        try {
            console.log('Saving chat for user:', currentUser.id, 'Messages:', chatHistory.length);
            const response = await fetch('/api/save-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    chat_data: chatHistory
                })
            });
            
            const result = await response.json();
            console.log('Save result:', result);
            
            if (response.ok) {
                alert(result.message || 'Chat saved successfully!');
                loadSidebarHistory(); // Refresh sidebar
            } else {
                alert('Failed to save chat: ' + result.detail);
            }
        } catch (error) {
            console.error('Error saving chat:', error);
            alert('Error saving chat: ' + error.message);
        }
    };
    
    // Sidebar functions
    const showSidebar = () => {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
        if (currentUser) loadSidebarHistory();
    };
    
    const hideSidebar = () => {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    };
    
    const loadSidebarHistory = async () => {
        if (!currentUser) return;
        
        sidebarLoading.classList.remove('hidden');
        sidebarHistory.classList.add('hidden');
        sidebarEmpty.classList.add('hidden');
        
        try {
            console.log('Loading history for user:', currentUser.id);
            const response = await fetch(`/api/chat-history/${currentUser.id}`);
            const result = await response.json();
            console.log('History result:', result);
            
            sidebarLoading.classList.add('hidden');
            
            if (result.success && result.data.length > 0) {
                displaySidebarHistory(result.data);
                sidebarHistory.classList.remove('hidden');
            } else {
                console.log('No history found or empty data');
                sidebarEmpty.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error loading sidebar history:', error);
            sidebarLoading.classList.add('hidden');
            sidebarEmpty.classList.remove('hidden');
        }
    };
    
    const displaySidebarHistory = (chatData) => {
        sidebarHistory.innerHTML = '';
        
        chatData.forEach((chat, index) => {
            const firstUserMessage = chat.chat_data.find(msg => msg.sender === 'user');
            const preview = firstUserMessage ? firstUserMessage.text.substring(0, 40) + '...' : 'Chat';
            const date = new Date(chat.created_at).toLocaleDateString();
            
            const chatItem = document.createElement('div');
            chatItem.className = 'p-3 rounded hover:bg-gray-700 transition-colors flex justify-between items-center';
            chatItem.innerHTML = `
                <div class="flex-1 cursor-pointer" onclick="loadChatFromHistory(${JSON.stringify(chat.chat_data).replace(/"/g, '&quot;')})">
                    <div class="text-xs md:text-sm font-medium" style="color: #EEEEEE;">${preview}</div>
                    <div class="text-xs" style="color: #888;">${date} • ${chat.chat_data.length} msgs</div>
                </div>
                <button onclick="deleteChat(${chat.id})" class="text-red-400 hover:text-red-300 p-1 text-sm">
                    🗑️
                </button>
            `;
            
            sidebarHistory.appendChild(chatItem);
        });
    };
    
    const deleteChat = async (chatId) => {
        if (!confirm('Delete this chat?')) return;
        
        try {
            const response = await fetch(`/api/delete-chat/${chatId}`, { method: 'DELETE' });
            if (response.ok) {
                loadSidebarHistory();
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    };
    
    const loadChatFromHistory = (chatData) => {
        chatContainer.innerHTML = '';
        chatHistory = [];
        
        chatData.forEach(msg => {
            addToChatLog(msg.text, msg.sender);
        });
        
        hideSidebar();
        clearBtnContainer.classList.remove('hidden');
    };
    
    // Make functions globally accessible
    window.deleteChat = deleteChat;
    window.loadChatFromHistory = loadChatFromHistory;
    
    // Event listeners
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '/auth';
    });
    
    saveChatBtn.addEventListener('click', saveChat);
    
    // Sidebar event listeners
    toggleSidebar.addEventListener('click', showSidebar);
    closeSidebar.addEventListener('click', hideSidebar);
    sidebarOverlay.addEventListener('click', hideSidebar);
    
    // Mobile menu functionality
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileToggleSidebar = document.getElementById('mobileToggleSidebar');
    const mobileConfigBtn = document.getElementById('mobileConfigBtn');
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    const mobileUserInfo = document.getElementById('mobileUserInfo');
    const mobileMessageCount = document.getElementById('mobileMessageCount');
    
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
    
    document.addEventListener('click', (e) => {
        if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
            mobileMenu.classList.add('hidden');
        }
    });
    
    mobileToggleSidebar.addEventListener('click', () => {
        showSidebar();
        mobileMenu.classList.add('hidden');
    });
    
    mobileConfigBtn.addEventListener('click', () => {
        showApiModal();
        mobileMenu.classList.add('hidden');
    });
    
    mobileLogoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '/auth';
    });
    
    // Load stored keys on page load
    loadStoredKeys();
    
    // Check authentication on page load
    checkAuth();

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
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close(1000, "Manual cleanup");
            }
            socket = null;
        }
        
        // Reset states
        isRecording = false;
        currentAiMessageContentElement = null;
        
        // Reset UI
        updateUIForRecording(false);
    };

    const startRecording = async () => {
        console.log("🎤 Starting fresh recording session...");
        statusDisplay.textContent = "Connecting...";
        statusDisplay.classList.remove("text-red-400");
        
        // Clean up any existing resources first
        cleanupResources();
        
        // Initialize AudioContext
        if (!audioContext || audioContext.state === 'closed') {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: 44100,
                    latencyHint: 'interactive'
                });
                console.log("✅ Audio context created successfully");
            } catch (e) {
                alert("Web Audio API is not supported in this browser.");
                console.error("Error creating AudioContext", e);
                return;
            }
        }
        
        if (audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
                console.log("✅ Audio context resumed");
            } catch (e) {
                console.error("Failed to resume audio context:", e);
                statusDisplay.textContent = "Audio initialization failed";
                statusDisplay.classList.add("text-red-400");
                return;
            }
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
                
                // Send API keys to server
                socket.send(JSON.stringify({
                    type: "api_keys",
                    keys: apiKeys
                }));
                
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
                                try {
                                    const audioData = atob(data.data);
                                    
                                    // Validate base64 decoded data
                                    if (!audioData || audioData.length === 0) {
                                        console.warn("⚠️ Empty audio data received, skipping...");
                                        break;
                                    }
                                    
                                    const byteNumbers = new Array(audioData.length);
                                    for (let i = 0; i < audioData.length; i++) {
                                        byteNumbers[i] = audioData.charCodeAt(i);
                                    }
                                    const byteArray = new Uint8Array(byteNumbers);
                                    
                                    // Validate the resulting buffer
                                    if (byteArray.buffer.byteLength === 0) {
                                        console.warn("⚠️ Empty audio buffer, skipping...");
                                        break;
                                    }
                                    
                                    console.log(`🎵 Lelouch AI: Processing audio chunk ${audioChunkIndex + 1}. Size: ${byteArray.buffer.byteLength} bytes. Queueing it up!`);
                                    audioChunkIndex++;
                                    
                                    audioQueue.push(byteArray.buffer);
                                    
                                    if (!isPlaying) {
                                        console.log(`▶️ Lelouch AI: Let's play the first chunk! I have ${audioQueue.length} pieces of my response ready.`);
                                        playNextChunk();
                                    }
                                } catch (error) {
                                    console.error("Error processing audio chunk:", error);
                                    console.warn("Skipping corrupted audio chunk...");
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
            recordBtn.classList.add("recording");
            recordBtn.style.backgroundColor = "#393E46";
            statusDisplay.textContent = "Connecting...";
            statusDisplay.classList.remove("text-red-400");
            chatDisplay.classList.remove("hidden");
            clearBtnContainer.classList.add("hidden");
        } else {
            recordBtn.classList.remove("recording");
            recordBtn.style.backgroundColor = "#00ADB5";
            statusDisplay.textContent = "Ready";
            statusDisplay.style.color = "#EEEEEE";
            statusDisplay.classList.remove("text-red-400");
        }
    };

    const updateMessageCount = () => {
        const messageCount = document.getElementById('messageCount');
        const mobileMessageCount = document.getElementById('mobileMessageCount');
        const totalMessages = chatHistory.length;
        const countText = `${totalMessages} message${totalMessages !== 1 ? 's' : ''}`;
        messageCount.textContent = countText;
        if (mobileMessageCount) mobileMessageCount.textContent = countText;
    };

    const addToChatLog = (text, sender) => {
        const messageElement = document.createElement("div");
        messageElement.className = 'chat-message';

        const prefixSpan = document.createElement('span');
        const contentSpan = document.createElement('span');
        contentSpan.className = 'message-content';

        if (sender === 'user') {
            prefixSpan.className = 'user-prefix';
            prefixSpan.style.color = '#00ADB5';
            prefixSpan.textContent = 'You: ';
            contentSpan.textContent = text;
            contentSpan.style.color = '#EEEEEE';
            chatHistory.push({ sender: 'user', text: text, timestamp: new Date().toISOString() });
        } else {
            prefixSpan.className = 'ai-prefix';
            prefixSpan.style.color = '#00ADB5';
            prefixSpan.textContent = 'Lelouch AI: ';
            contentSpan.className += ' markdown-content';
            contentSpan.style.color = '#EEEEEE';
            if (text) {
                contentSpan.innerHTML = marked.parse(text);
                // Save AI response to history
                chatHistory.push({ sender: 'ai', text: text, timestamp: new Date().toISOString() });
            }
        }
        
        messageElement.appendChild(prefixSpan);
        messageElement.appendChild(contentSpan);
        chatContainer.appendChild(messageElement);

        if (chatContainer.children.length > 0) {
            clearBtnContainer.classList.remove("hidden");
        }
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Update message count
        updateMessageCount();
        
        return contentSpan; 
    };

    clearBtn.addEventListener("click", () => {
        chatContainer.innerHTML = '';
        chatHistory = [];
        clearBtnContainer.classList.add("hidden");
        updateMessageCount();
    });

    recordBtn.addEventListener("click", async () => {
        if (recordBtn.disabled) {
            showApiModal();
            return;
        }
        
        if (isRecording) {
            console.log("🛑 Stopping current recording session...");
            stopRecording();
        } else {
            console.log("🎤 Starting new recording session...");
            await startRecording();
        }
    });

    window.addEventListener('beforeunload', () => {
        cleanupResources();
    });
});