// js/gridNavigation.js - Linear 4x2 Grid Navigation Engine (Streamlined Accessible Audio & Screen Reader Output)

document.addEventListener("DOMContentLoaded", () => {
    initGridNavigation();
});

async function initGridNavigation() {
    try {
        // 1. Fetch master configuration
        const response = await fetch(window.PATHS.DATA.datasetsConfig);
        const data = await response.json();
        const dataset = data.datasets[data.activeDataset];

        const canvas = document.getElementById("mapCanvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const statusRegion = document.getElementById("statusRegion");

        // Set canvas dimensions from JSON config
        canvas.width = dataset.canvasSettings.width;
        canvas.height = dataset.canvasSettings.height;

        // 2. Dynamically pull design system colors from CSS variables in style.css
        const computedStyle = getComputedStyle(document.documentElement);
        const focusRingColor = computedStyle.getPropertyValue('--focus-ring').trim() || '#facc15';
        const cursorLineColor = computedStyle.getPropertyValue('--cursor-line').trim() || '#38bdf8';

        // 3. Load the NASA map image
        const img = new Image();
        img.src = dataset.paths.image;

        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Draw initial focus box on Zone 1 without shouting aria-live speech on page load
            const cellWidth = canvas.width / cols;
            const cellHeight = canvas.height / rows;
            const { x, y } = getCoords(currentIndex);
            ctx.strokeStyle = focusRingColor;
            ctx.lineWidth = 4;
            ctx.strokeRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);

            // Keep status ready without forcing an immediate screen reader interruption
            statusRegion.textContent = "Map loaded. Press Tab to enter map, use Arrow Keys to explore.";
        };

        // 4. Initialize Tone.js Synth
        let isMuted = false;
        const synthConfig = dataset.synthSettings;
        const synth = new Tone.Synth({
            oscillator: { type: synthConfig.oscillatorType },
            envelope: synthConfig.envelope
        }).toDestination();

        // 5. Linear Grid State Setup (4 cols x 2 rows = 8 total zones, starting at index 0)
        const cols = dataset.gridSettings.columns;
        const rows = dataset.gridSettings.rows;
        const totalCells = cols * rows; // 8 zones
        let currentIndex = 0; // Starts at top-left (0,0)

        // Helper: Convert linear index to (X, Y) coordinates
        function getCoords(index) {
            return {
                x: index % cols,
                y: Math.floor(index / cols)
            };
        }

        // Helper to get current cell data & streamlined narration (Zero zone/coordinate fluff)
        function getCurrentCellInfo() {
            const { x, y } = getCoords(currentIndex);
            const key = `${x},${y}`;
            return dataset.gridData[key] || {
                name: "Open Ocean Sector",
                narration: "Open oceanic waters."
            };
        }

        // 6. Visual Focus Box & Cursor Animation Renderer
        function drawScene(highlightCursorX = null) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const cellWidth = canvas.width / cols;
            const cellHeight = canvas.height / rows;
            const { x, y } = getCoords(currentIndex);

            // Draw highlighted border using CSS variable color (--focus-ring)
            ctx.strokeStyle = focusRingColor;
            ctx.lineWidth = 4;
            ctx.strokeRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);

            // If audio stream is playing, draw moving cursor line using CSS variable color (--cursor-line)
            if (highlightCursorX !== null) {
                ctx.strokeStyle = cursorLineColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(highlightCursorX, y * cellHeight);
                ctx.lineTo(highlightCursorX, (y + 1) * cellHeight);
                ctx.stroke();
            }
        }

        // Update status readout with pure geographic narration (No zone numbers or coordinate clutter)
        function updateDisplay() {
            const cellInfo = getCurrentCellInfo();
            statusRegion.textContent = cellInfo.narration;
            drawScene();
        }

        // 7. Play Arrival Chime (Two-tone pleasant chord for Home reset)
        async function playArrivalChime() {
            if (isMuted) return;
            if (Tone.context.state !== "running") {
                await Tone.start();
            }
            synth.triggerAttackRelease("523.25", "8n"); // C5
            setTimeout(() => {
                synth.triggerAttackRelease("783.99", "8n"); // G5
            }, 150);
        }

        // 8. True Left-to-Right Pixel-by-Pixel Continuous Audio Scan & Gliding Sonification
        // 8. True Left-to-Right Pixel-by-Pixel Continuous Audio Scan (Pure Audio, Zero Narration)
        async function playCellAudioStream() {
            if (isMuted) return;

            if (Tone.context.state !== "running") {
                await Tone.start();
            }

            const cellWidth = canvas.width / cols;
            const cellHeight = canvas.height / rows;
            const { x, y } = getCoords(currentIndex);
            
            const startXPixel = Math.floor(x * cellWidth);
            const endXPixel = Math.floor((x + 1) * cellWidth);
            const sampleY = Math.floor((y * cellHeight) + (cellHeight / 2));

            const minFreq = dataset.audioLegend.minFrequency;
            const maxFreq = dataset.audioLegend.maxFrequency;

            // Start continuous synth tone at the first pixel's frequency (No text updates!)
            const initialPixelData = ctx.getImageData(startXPixel, sampleY, 1, 1).data;
            const initialFreq = minFreq + (initialPixelData[0] / 255) * (maxFreq - minFreq);
            
            synth.triggerAttack(initialFreq);

            // Scan every single pixel column (1-by-1) across the cell width smoothly
            const totalPixels = endXPixel - startXPixel;
            const scanDurationMs = 1500; // 1.5 seconds sweep duration
            const timePerPixel = scanDurationMs / totalPixels;

            for (let scanX = startXPixel; scanX < endXPixel; scanX++) {
                const pixelData = ctx.getImageData(scanX, sampleY, 1, 1).data;
                const red = pixelData[0];
                const frequency = minFreq + (red / 255) * (maxFreq - minFreq);

                synth.frequency.rampTo(frequency, timePerPixel / 1000);
                drawScene(scanX);

                await new Promise(resolve => setTimeout(resolve, timePerPixel));
            }

            // Stop continuous synth note and reset cursor silently
            synth.triggerRelease();
            drawScene();
        }

        // 9. Keyboard Navigation Event Listener (Streamlined announcements)
        window.addEventListener("keydown", async (event) => {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
                event.preventDefault();

                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    if (currentIndex > 0) {
                        currentIndex--;
                        updateDisplay();
                    } else {
                        statusRegion.textContent = "Beginning of map reached.";
                    }
                } 
                else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    if (currentIndex < totalCells - 1) {
                        currentIndex++;
                        updateDisplay();
                    } else {
                        statusRegion.textContent = "End of map reached. Press End key to exit.";
                    }
                }
            } 
            else if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                playCellAudioStream();
            } 
            else if (event.key === "Home") {
                event.preventDefault();
                currentIndex = 0;
                statusRegion.textContent = "Returned to origin.";
                playArrivalChime();
                updateDisplay();
            } 
            else if (event.key === "End" || event.key === "Escape") {
                event.preventDefault();
                canvas.blur();
                statusRegion.textContent = "Exited map exploration.";
            }
            else if (event.key.toLowerCase() === "m") {
                event.preventDefault();
                isMuted = !isMuted;
                const muteBtn = document.getElementById("btnMute");
                if (isMuted) {
                    synth.volume.value = -Infinity;
                    if (muteBtn) muteBtn.textContent = "🔇 Unmute Synth (M)";
                    statusRegion.textContent = "Synthesizer muted.";
                } else {
                    synth.volume.value = 0;
                    if (muteBtn) muteBtn.textContent = "🔊 Mute Synth (M)";
                    statusRegion.textContent = "Synthesizer unmuted.";
                }
            }
        });

        // 10. UI Control Panel Listeners
        document.getElementById("btnHome").addEventListener("click", () => {
            currentIndex = 0;
            playArrivalChime();
            updateDisplay();
        });

        document.getElementById("btnExit").addEventListener("click", () => {
            canvas.blur();
            statusRegion.textContent = "Exited map exploration via control panel.";
        });

        document.getElementById("btnMute").addEventListener("click", () => {
            isMuted = !isMuted;
            const muteBtn = document.getElementById("btnMute");
            if (isMuted) {
                synth.volume.value = -Infinity;
                muteBtn.textContent = "🔇 Unmute Synth (M)";
            } else {
                synth.volume.value = 0;
                muteBtn.textContent = "🔊 Mute Synth (M)";
            }
        });

        document.getElementById("btnReplay").addEventListener("click", () => {
            playCellAudioStream();
        });

    } catch (error) {
        console.error("Error initializing grid navigation:", error);
    }
}