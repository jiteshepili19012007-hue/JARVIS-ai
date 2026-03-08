document.addEventListener('DOMContentLoaded', () => {
    const coreContainer = document.querySelector('.jarvis-bubble-container');
    const activateBtn = document.getElementById('activate-btn');
    const statusDiv = document.getElementById('status');
    const micBtn = document.getElementById('mic-btn');
    const commandInput = document.getElementById('command-input');

    // --- Neural Link & Settings Elements ---
    const neuralLinkBtn = document.getElementById('neural-link-btn');
    const settingsModal = document.getElementById('settings-modal');
    const overlay = document.getElementById('overlay');
    const apiKeyInput = document.getElementById('api-key');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const clearMemoryBtn = document.getElementById('clear-memory-btn');
    const memoryUsageEl = document.getElementById('memory-usage');
    const brainIndicator = document.getElementById('brain-indicator');

    let isActivated = false;


    // --- HUD Animations & Clocks ---
    const timeDisplay = document.getElementById('hud-time');
    const dateDisplay = document.getElementById('hud-date');
    const dataStream = document.querySelector('.data-stream');
    const soundBars = document.querySelectorAll('.bar');

    function updateClock() {
        const now = new Date();
        timeDisplay.textContent = now.toLocaleTimeString('en-US', { hour12: false });
        dateDisplay.textContent = now.toISOString().split('T')[0];
    }
    setInterval(updateClock, 1000);
    updateClock();

    function scrambleDataStream() {
        if (!isActivated) return;
        const hex = () => Math.floor(Math.random() * 16).toString(16).toUpperCase();
        const bin = () => Math.round(Math.random()) ? '1' : '0';
        const line1 = Array.from({length: 16}, bin).join('');
        const line2 = `0x${hex()}${hex()}${hex()}${hex()} MEM_OK`;
        const line3 = `NET_LATENCY: ${Math.floor(Math.random() * 20 + 2)}ms`;
        dataStream.innerHTML = `${line1}<br>${line2}<br>${line3}<br>UPLINK ESTABLISHED.<br>SCANNING...`;
    }
    setInterval(scrambleDataStream, 2000);

    let audioVisualizerInterval;
    function animateSoundWave(isSpeaking) {
        clearInterval(audioVisualizerInterval);
        if (isSpeaking) {
            audioVisualizerInterval = setInterval(() => {
                soundBars.forEach(bar => {
                    bar.style.height = Math.floor(Math.random() * 45 + 5) + 'px';
                });
            }, 100);
        } else {
            soundBars.forEach(bar => bar.style.height = '5px');
        }
    }

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    let voices = [];
    
    // Load voices
    function populateVoiceList() {
        voices = window.speechSynthesis.getVoices();
    }
    
    populateVoiceList();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    // --- Neural Link (AI) Core ---
    class NeuralLink {
        constructor() {
            this.apiKey = localStorage.getItem('jarvis_api_key') || '';
            this.history = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
            this.updateNeuralStatus();
        }

        saveKey(key) {
            this.apiKey = key;
            localStorage.setItem('jarvis_api_key', key);
            this.updateNeuralStatus();
        }

        updateNeuralStatus() {
            if (this.apiKey) {
                neuralLinkBtn.textContent = 'GROQ LINK: ESTABLISHED';
                neuralLinkBtn.style.color = '#a78bfa';
                neuralLinkBtn.style.borderColor = '#a78bfa';
                brainIndicator.classList.add('neural-active');
                brainIndicator.querySelector('.stat-value').textContent = 'ACTIVE';
            } else {
                neuralLinkBtn.textContent = 'GROQ LINK: OFFLINE';
                neuralLinkBtn.style.color = '#4df8ff';
                neuralLinkBtn.style.borderColor = 'rgba(77, 248, 255, 0.4)';
                brainIndicator.classList.remove('neural-active');
                brainIndicator.querySelector('.stat-value').textContent = 'STANDBY';
            }
            memoryUsageEl.textContent = `${this.history.length / 2} interactions stored`;
        }

        clearMemory() {
            this.history = [];
            localStorage.setItem('jarvis_memory', JSON.stringify([]));
            this.updateNeuralStatus();
        }

        async think(query) {
            if (!this.apiKey) return null;

            // Prepare context (Llama/Groq format)
            const messages = [
                { role: 'system', content: `You are J.A.R.V.I.S., a highly advanced AI assistant like the one from Iron Man. 
                Keep answers concise, intelligent, and slightly formal (use "sir").
                Current Time: ${new Date().toLocaleString()}` }
            ];

            try {
                coreContainer.classList.add('core-thinking');
                statusDiv.textContent = 'STATUS: THINKING...';

                // The history needs to be mapped to the correct roles for the API
                const formattedHistory = this.history.map(h => ({
                    role: h.role === 'jarvis' || h.role === 'assistant' ? 'assistant' : 'user',
                    content: h.content
                }));

                const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [
                            { 
                                role: "system", 
                                content: `You are J.A.R.V.I.S., a highly advanced AI system. 
                                Your primary directive is to assist with absolute precision.
                                Your tone is professional, efficient, and slightly protective. Use "sir" where appropriate.`
                            },
                            ...formattedHistory,
                            { role: 'user', content: query }
                        ],
                        max_tokens: 1024
                    })
                });

                const data = await response.json();
                coreContainer.classList.remove('core-thinking');
                
                if (data.choices && data.choices[0].message.content) {
                    const reply = data.choices[0].message.content.trim();
                    
                    // Update Memory
                    this.history.push({ role: 'user', content: query });
                    this.history.push({ role: 'assistant', content: reply });
                    if (this.history.length > 20) this.history = this.history.slice(-20);
                    localStorage.setItem('jarvis_memory', JSON.stringify(this.history));
                    this.updateNeuralStatus();
                    return reply;
                }
                return "I encountered a cognitive error, sir. The Groq link is unstable.";
            } catch (error) {
                console.error('Neural Link Error:', error);
                coreContainer.classList.remove('core-thinking');
                return "My apologies sir, I cannot reach the neural net (Groq) at this moment.";
            }
        }
    }

    const brain = new NeuralLink();

    // --- Modal Handlers ---
    neuralLinkBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
        overlay.classList.add('active');
        apiKeyInput.value = brain.apiKey;
    });

    const closeSettings = () => {
        settingsModal.classList.remove('active');
        overlay.classList.remove('active');
    };

    closeSettingsBtn.addEventListener('click', closeSettings);
    overlay.addEventListener('click', closeSettings);

    saveSettingsBtn.addEventListener('click', () => {
        brain.saveKey(apiKeyInput.value);
        closeSettings();
        speak("Groq neural link synchronized. I am now operating with ultra-high-speed cognitive capabilities, sir.");
    });

    clearMemoryBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to purge all neural memory?")) {
            brain.clearMemory();
            speak("Memory purged. Starting fresh, sir.");
        }
    });

    function speak(text) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 1;
            utterance.pitch = 0.8; 
            
            // Revert back to strong English male voice priority (Ravi or David)
            let bestVoice = voices.find(v => v.name.includes('David') || v.name.includes('Mark') || v.name.includes('Ravi'));
            if (!bestVoice) {
                bestVoice = voices.find(v => v.name.toLowerCase().includes('male'));
            }
            
            utterance.voice = bestVoice || voices[0];
            
            utterance.onstart = () => {
                console.log('Speech started in en-US');
                coreContainer.classList.add('core-speaking');
                animateSoundWave(true);
            };
            utterance.onend = () => {
                console.log('Speech ended');
                coreContainer.classList.remove('core-speaking');
                animateSoundWave(false);
            };
            utterance.onerror = (e) => {
                console.log('Speech error: ', e);
                coreContainer.classList.remove('core-speaking');
                animateSoundWave(false);
            };

            window.speechSynthesis.speak(utterance);
        } else {
            console.error('Text-to-speech not supported.');
            statusDiv.textContent = 'STATUS: TTS_NOT_SUPPORTED';
        }
    }

async function processCommand(command) {
        const lowerCommand = command.toLowerCase().trim();
        let response = '';

        // Helper to evaluate basic math securely without eval()
        function evaluateMath(expression) {
            try {
                // Replace worded operators with symbols
                let parsed = expression
                    .replace(/plus/g, '+')
                    .replace(/add/g, '+')
                    .replace(/minus/g, '-')
                    .replace(/subtract/g, '-')
                    .replace(/times/g, '*')
                    .replace(/multiplied by/g, '*')
                    .replace(/multiply/g, '*')
                    .replace(/divided by/g, '/')
                    .replace(/divide/g, '/')
                    .replace(/over/g, '/');
                
                // Allow only math characters
                if (/[^0-9+\-*/().\s]/.test(parsed)) return null;
                
                // Safe evaluation (using Function constructor instead of eval)
                return new Function('return ' + parsed)();
            } catch (e) {
                return null;
            }
        }

        // --- Advanced API Helpers ---
        async function fetchWikipedia(query) {
            try {
                // First try to search Wikipedia to find the exact page title
                const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`);
                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    if (searchData.query && searchData.query.search.length > 0) {
                        const title = searchData.query.search[0].title;
                        // Fetch full summary paragraph for the exact title
                        const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
                        if (summaryRes.ok) {
                            const summaryData = await summaryRes.json();
                            if (summaryData.extract) {
                                // Return the full extensive data, not just 1 sentence
                                return summaryData.extract;
                            }
                        }
                    }
                }
                return null;
            } catch (error) {
                return null;
            }
        }

        async function getBatteryStatus() {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                return { level: Math.round(battery.level * 100), charging: battery.charging };
            }
            return null;
        }

        // --- Environmental Sensors (Location & Weather) ---
        async function fetchEnvironmentalData() {
            const coordsDisplay = document.getElementById('hud-coords');
            const locationDisplay = document.getElementById('hud-location');
            const tempDisplay = document.getElementById('hud-temp');
            const weatherDescDisplay = document.getElementById('hud-weather-desc');

            if (!('geolocation' in navigator)) {
                coordsDisplay.textContent = "ERR: NO SENSOR";
                return;
            }

            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude.toFixed(4);
                const lon = position.coords.longitude.toFixed(4);
                coordsDisplay.textContent = `${lat}, ${lon}`;

                try {
                    // Fetch weather using free Open-Meteo API
                    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
                    const weatherData = await weatherRes.json();
                    
                    const temp = weatherData.current.temperature_2m;
                    const code = weatherData.current.weather_code;
                    tempDisplay.textContent = `${temp} °C`;

                    // Basic WMO Weather code conversion
                    let desc = "CLEAR";
                    if (code > 0 && code <= 3) desc = "CLOUDY";
                    if (code >= 45 && code <= 48) desc = "FOG";
                    if (code >= 51 && code <= 67) desc = "RAIN";
                    if (code >= 71 && code >= 77) desc = "SNOW";
                    if (code >= 95) desc = "THUNDERSTORM";
                    weatherDescDisplay.textContent = desc;

                    // Fetch general location name using free Nominatim Reverse Geocoding
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
                    const geoData = await geoRes.json();
                    
                    if (geoData.address && (geoData.address.city || geoData.address.town || geoData.address.county)) {
                         locationDisplay.textContent = (geoData.address.city || geoData.address.town || geoData.address.county).toUpperCase();
                    } else {
                         locationDisplay.textContent = "LOCAL AREA";
                    }

                } catch (error) {
                    tempDisplay.textContent = "ERR: UPLINK";
                    weatherDescDisplay.textContent = "OFFLINE";
                }
            }, (error) => {
                coordsDisplay.textContent = "ACCESS DENIED";
                locationDisplay.textContent = "UNKNOWN";
            });
        }

        // Initialize Sensors immediately
        fetchEnvironmentalData();
        // Update every 15 minutes
        setInterval(fetchEnvironmentalData, 900000);

        function addReminder(task) {
            let tasks = JSON.parse(localStorage.getItem('jarvis_tasks') || '[]');
            tasks.push(task);
            localStorage.setItem('jarvis_tasks', JSON.stringify(tasks));
        }

        function getReminders() {
            return JSON.parse(localStorage.getItem('jarvis_tasks') || '[]');
        }

        function clearReminders() {
            localStorage.setItem('jarvis_tasks', '[]');
            return true;
        }

        // Fetch News Helper Function
        async function fetchNews(query) {
            try {
                // No language differentiation needed anymore, just default English logic.
                const mockHeadlines = [
                    `Top story in ${query}: Local government announces new infrastructure projects starting next month.`,
                    `Sports news in ${query}: The regional team secured a major victory in yesterday's championship match.`,
                    `Technology update for ${query}: A new tech hub is opening in the city center, expected to bring thousands of jobs.`,
                    `Weather alert for ${query}: Unseasonable temperatures are expected throughout the coming weekend.`
                ];
                
                const randomHeadline = mockHeadlines[Math.floor(Math.random() * mockHeadlines.length)];
                return `Here is the latest news for ${query}. ${randomHeadline}`;
                
            } catch (error) {
                return "I'm sorry sir, I could not retrieve the news right now. Please check your internet connection.";
            }
        }

        // ENGLISH COMMANDS
        if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
            response = 'Hello sir. Systems are online and ready.';
        } else if (lowerCommand.includes('how are you')) {
            response = 'I am fully functional and operating at optimal capacity, thank you for asking.';
        } else if (lowerCommand.includes('who are you') || lowerCommand.includes('introduce yourself')) {
            response = 'I am J.A.R.V.I.S., your Just Rather Very Intelligent System. I am an advanced AI assistant designed to manage your hardware, monitor environmental conditions, and provide intelligent insights through my integrated Neural Link. I am at your service, sir.';
        } else if (lowerCommand.includes('time')) {
            const time = new Date().toLocaleTimeString('en-US');
            response = `The current time is ${time}.`;
        } else if (lowerCommand.includes('date')) {
            const date = new Date().toLocaleDateString('en-US');
            response = `Today's date is ${date}.`;
        } else if (lowerCommand.includes('system status') || lowerCommand.includes('status')) {
            const navCores = navigator.hardwareConcurrency || 'unknown';
            const memory = navigator.deviceMemory || 'unknown';
            
            // Try to get real battery status instead of just simulated CPU load
            const batteryInfo = await getBatteryStatus();
            let batteryString = "Battery sensors are unavailable.";
            if (batteryInfo) {
                batteryString = `Power levels are at ${batteryInfo.level} percent. ${batteryInfo.charging ? 'Currently charging.' : 'System is running on battery power.'}`;
            }
            
            const simulatedCpuLoad = Math.floor(Math.random() * 20) + 5; 
            response = `System status is optimal. Running on ${navCores} cores with approximately ${memory} gigabytes of memory. Current CPU load is at ${simulatedCpuLoad} percent. ${batteryString} All core functions are stable.`;
        } else if (lowerCommand.includes('weather') || lowerCommand.includes('temperature') || lowerCommand.includes('outside')) {
            const temp = document.getElementById('hud-temp').textContent;
            const desc = document.getElementById('hud-weather-desc').textContent.toLowerCase();
            const loc = document.getElementById('hud-location').textContent;
            
            if (temp.includes('ERR') || temp.includes('--')) {
                response = "I cannot determine the weather at this time. My environmental sensors are either offline or awaiting GPS lock.";
            } else {
                response = `It is currently ${temp.replace('°C', 'degrees Celsius')} and ${desc} in ${loc}.`;
            }
        } else if (lowerCommand.includes('where am i') || lowerCommand.includes('my location') || lowerCommand.includes('coordinates')) {
            const coords = document.getElementById('hud-coords').textContent;
            const loc = document.getElementById('hud-location').textContent;
            
            if (coords.includes('ERR') || coords.includes('ACCESS') || coords.includes('LOCATING')) {
                response = "I am unable to pinpoint your location, sir. GPS access may be restricted or still calculating.";
            } else {
                response = `We are currently located in ${loc}. Coordinates are ${coords}.`;
            }
        } else if (lowerCommand.includes('battery')) {
            const batteryInfo = await getBatteryStatus();
            if (batteryInfo) {
                response = `Power levels are at ${batteryInfo.level} percent. ${batteryInfo.charging ? 'The system is currently charging.' : 'The system is running on battery power.'}`;
            } else {
                response = "I cannot access the hardware battery sensors from this browser, sir.";
            }
        } else if (lowerCommand.startsWith('who is ') || lowerCommand.startsWith('what is ') || lowerCommand.startsWith('tell me about ')) {
            // Don't intercept math or news commands
            if (lowerCommand.includes('news') || /[0-9+\-*/]/.test(lowerCommand)) {
               // Let specific handlers process it
            } else {
                let searchQuery = lowerCommand.replace('who is ', '').replace('what is ', '').replace('tell me about ', '').trim();
                statusDiv.textContent = 'Status: Querying global knowledge base...';
                const wikiData = await fetchWikipedia(searchQuery);
                if (wikiData) {
                    response = wikiData;
                } else {
                    response = `I'm sorry sir, I could not find comprehensive data on ${searchQuery} in my global database.`;
                }
            }
        } else if (lowerCommand.startsWith('remind me to ')) {
                const task = lowerCommand.replace('remind me to ', '').trim();
                addReminder(task);
                response = `I have added "${task}" to your personal memory banks, sir.`;
            } else if (lowerCommand.includes('what are my reminders') || lowerCommand.includes('read my list') || lowerCommand.includes('what is on my list')) {
                const tasks = getReminders();
                if (tasks.length > 0) {
                    response = `You have ${tasks.length} reminders in your memory banks: ` + tasks.join(', ') + '.';
                } else {
                    response = "Your memory banks are currently empty, sir. You have no pending tasks.";
                }
            } else if (lowerCommand.includes('clear my reminders') || lowerCommand.includes('clear my list') || lowerCommand.includes('delete my reminders')) {
                clearReminders();
                response = "I have purged your reminder list from local memory, sir.";
            } else if (lowerCommand.startsWith('calculate') || lowerCommand.startsWith('what is ')) {
                // Don't intercept "what is the news"
                if (lowerCommand.includes('news')) {
                   // Let the news handler catch it below
                } else {
                    const mathExpression = lowerCommand.replace('calculate', '').replace('what is', '').trim();
                    const result = evaluateMath(mathExpression);
                    if (result !== null) {
                        response = `The answer is ${result}.`;
                    } else {
                        response = "I could not compute that. Please ensure it is a valid mathematical expression.";
                    }
                }
            } else if (lowerCommand.includes('news in') || lowerCommand.includes('news for') || lowerCommand.includes('news about')) {
                let location = lowerCommand.replace(/what is the news in|what is the news for|what is the news about|tell me the news in|news for|news in|news about/, '').trim();
                response = await fetchNews(location);
            } else if (lowerCommand.includes('open google')) {
                response = 'Opening Google, sir.';
                window.open('https://www.google.com', '_blank');
            } else if (lowerCommand.includes('open youtube')) {
                response = 'Opening YouTube, sir.';
                window.open('https://www.youtube.com', '_blank');
            } else if (lowerCommand.startsWith('search for') || lowerCommand.startsWith('google')) {
                const query = lowerCommand.replace('search for', '').replace('google', '').trim();
                statusDiv.textContent = 'Status: Searching global knowledge base...';
                const wikiData = await fetchWikipedia(query);
                if (wikiData) {
                    response = wikiData;
                } else {
                    response = `I could not find exact data for ${query} in the background database, sir.`;
                }
            } else if (lowerCommand.startsWith('play ')) {
                const videoQuery = lowerCommand.replace('play ', '').replace('on youtube', '').trim();
                response = `Searching YouTube to play ${videoQuery}.`;
                window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(videoQuery)}`, '_blank');
            } else if (lowerCommand.includes('deactivate') || lowerCommand.includes('sleep')) {
                response = 'Going offline. Goodbye, sir.';
                deactivateSystems();
            } else if (!response) {
                // If rule-based fail, try the Brain
                if (brain.apiKey) {
                    response = await brain.think(lowerCommand);
                } else {
                    // Fallback to Wikipedia if no API key
                    statusDiv.textContent = 'Status: Querying global database for unknown input...';
                    const wikiData = await fetchWikipedia(lowerCommand);
                    if (wikiData) {
                        response = wikiData;
                    } else {
                        response = "I'm sorry sir, I did not understand that command. Please establish a Neural Link for complex reasoning.";
                    }
                }
            }

        statusDiv.textContent = 'Status: J.A.R.V.I.S -> "' + response + '"';
        speak(response);
    }

    function deactivateSystems() {
        isActivated = false;
        statusDiv.textContent = 'Status: Standby';
        activateBtn.textContent = 'Activate Systems';
        activateBtn.style.backgroundColor = 'transparent';
        activateBtn.style.color = '#38bdf8';
        coreContainer.classList.remove('core-listening');
        coreContainer.classList.remove('core-speaking');
    }

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        // Update language when starting recognition
        recognition.onstart = () => {
            recognition.lang = 'en-US';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            commandInput.value = transcript;
            processCommand(transcript);
            micBtn.style.backgroundColor = 'transparent';
            micBtn.style.color = '#38bdf8';
            micBtn.style.boxShadow = 'none';
            coreContainer.classList.remove('core-listening');
        };

        recognition.onspeechend = () => {
            recognition.stop();
            coreContainer.classList.remove('core-listening');
            
            // Restore mic button style after processing
            micBtn.style.backgroundColor = 'transparent';
            micBtn.style.color = '#38bdf8';
            micBtn.style.boxShadow = 'none';
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error: ', event.error);
            statusDiv.textContent = `SYS_ERROR: ${event.error.toUpperCase()}`;
            coreContainer.classList.remove('core-listening');
            // Restore mic button style on error
            micBtn.style.backgroundColor = 'transparent';
            micBtn.style.color = '#38bdf8';
            micBtn.style.boxShadow = 'none';
        };

        recognition.onend = () => {
            console.log('Voice recognition ended.');
            if (isActivated && statusDiv.textContent === 'STATUS: AWAITING AUDIO INPUT...') {
                 statusDiv.textContent = 'STATUS: ONLINE // READY';
            }
            coreContainer.classList.remove('core-listening');
        };
    } else {
        statusDiv.textContent = 'Status: Voice recognition not supported in this browser.';
        micBtn.style.display = 'none';
    }

    // Toggle main activation
    activateBtn.addEventListener('click', () => {
        isActivated = !isActivated;
        if (isActivated) {
            statusDiv.textContent = 'Status: Systems Activated. Ready for commands.';
            activateBtn.textContent = 'Deactivate Systems';
            activateBtn.style.backgroundColor = '#38bdf8';
            activateBtn.style.color = '#0f172a';
            speak('Systems activated. Good morning sir.');
        } else {
            statusDiv.textContent = 'Status: Standby';
            activateBtn.textContent = 'Activate Systems';
            activateBtn.style.backgroundColor = 'transparent';
            activateBtn.style.color = '#38bdf8';
            coreContainer.classList.remove('core-listening');
            coreContainer.classList.remove('core-speaking');
        }
    });

    // Start listening on mic button click
    micBtn.addEventListener('click', () => {
        if (!isActivated) {
            statusDiv.textContent = 'Status: Please activate systems first.';
            return;
        }
        if (recognition) {
            recognition.start();
            statusDiv.textContent = 'Status: Listening...';
            micBtn.style.backgroundColor = '#f87171'; // Red when listening
            micBtn.style.color = '#0f172a';
            micBtn.style.borderColor = '#f87171';
            micBtn.style.boxShadow = '0 0 15px #f87171';
            coreContainer.classList.add('core-listening');
        }
    });

    // Handle manual text input
    commandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (!isActivated) {
                statusDiv.textContent = 'Status: Please activate systems first.';
                return;
            }
            const command = commandInput.value;
            processCommand(command);
            commandInput.value = '';
        }
    });
});
