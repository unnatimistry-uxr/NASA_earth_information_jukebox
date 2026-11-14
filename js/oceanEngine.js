// ==========================================================================
// js/oceanEngine.js - Dynamic Ocean Navigation Engine (WCAG Accessible)
// ==========================================================================
// Handles 5 ocean regions with multi-box bounding support (e.g. split Pacific).
// ==========================================================================

//document.addEventListener("DOMContentLoaded", () => {
    initOceanEngine();
//});

async function initOceanEngine() {
    try {
        const response = await fetch(window.PATHS.DATA.datasetsConfig);
        if (!response.ok) throw new Error("Failed to load dataset configuration.");
        
        const data = await response.json();
        // Replace: const dataset = data.datasets[data.activeDataset];
        // With:
        const activeKey = window.TARGET_DATASET || data.activeDataset;
        const dataset = data.datasets[activeKey];

        if (dataset.navigationMode !== "oceans") {
            console.log("Dataset navigationMode is not 'oceans'. Skipping oceanEngine.");
            return;
        }

        const canvas = document.getElementById("mapCanvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const statusRegion = document.getElementById("statusRegion");
        const dynamicNavControls = document.getElementById("dynamicNavControls");

        canvas.width = dataset.canvasSettings.width;
        canvas.height = dataset.canvasSettings.height;

        const computedStyle = getComputedStyle(document.documentElement);
        const focusRingColor = computedStyle.getPropertyValue('--focus-ring').trim() || '#facc15';
        const cursorLineColor = computedStyle.getPropertyValue('--cursor-line').trim() || '#38bdf8';

        AudioCore.initSynth(dataset.synthSettings);

        const mapImage = new Image();
        mapImage.src = dataset.paths.image;

        mapImage.onload = () => {
            ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
            drawScene();
            statusRegion.textContent = "Ocean navigation loaded. Select an ocean button or use arrow keys.";
        };

        const oceanKeys = Object.keys(dataset.oceanRegions || {});
        let currentOceanIndex = 0;

        function getCurrentOceanKey() {
            return oceanKeys[currentOceanIndex];
        }

        function getCurrentOceanInfo() {
            const key = getCurrentOceanKey();
            return dataset.oceanRegions[key] || {
                name: "Unknown Ocean",
                narration: "Ocean region.",
                boxes: []
            };
        }

        function drawScene(cursorX = null) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

            const oceanInfo = getCurrentOceanInfo();
            const boxes = oceanInfo.boxes || [];

            // Draw bounding boxes for all parts of this ocean region (handles split Pacific)
            boxes.forEach(box => {
                ctx.strokeStyle = focusRingColor;
                ctx.lineWidth = 4;
                ctx.strokeRect(box.x, box.y, box.w, box.h);
            });

            // Draw scanning cursor line if active
            if (cursorX !== null) {
                // Find which box the cursor currently falls into
                for (let box of boxes) {
                    if (cursorX >= box.x && cursorX <= box.x + box.w) {
                        ctx.strokeStyle = cursorLineColor;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(Math.floor(cursorX), Math.floor(box.y));
                        ctx.lineTo(Math.floor(cursorX), Math.floor(box.y + box.h));
                        ctx.stroke();
                        break;
                    }
                }
            }
        }

        function updateDisplay() {
            const oceanInfo = getCurrentOceanInfo();
            statusRegion.textContent = oceanInfo.narration;
            drawScene();
        }

        function renderOceanControls() {
            if (!dynamicNavControls) return;
            dynamicNavControls.innerHTML = "";

            const fieldset = document.createElement("fieldset");
            const legend = document.createElement("legend");
            legend.textContent = "Ocean Region Selection";
            fieldset.appendChild(legend);

            oceanKeys.forEach((key, index) => {
                const ocean = dataset.oceanRegions[key];
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "control-btn";
                btn.textContent = ocean.name;
                btn.setAttribute("aria-label", `Select ${ocean.name}`);
                
                if (index === currentOceanIndex) {
                    btn.setAttribute("aria-pressed", "true");
                } else {
                    btn.setAttribute("aria-pressed", "false");
                }

                btn.addEventListener("click", () => {
                    currentOceanIndex = index;
                    updateDisplay();
                    renderOceanControls();
                });

                fieldset.appendChild(btn);
            });

            dynamicNavControls.appendChild(fieldset);
        }

        renderOceanControls();

        async function playAudioStream() {
            const oceanInfo = getCurrentOceanInfo();
            const boxes = oceanInfo.boxes || [];

            await AudioCore.scanBoundingBoxes(
                ctx,
                boxes,
                dataset.audioConfig,
                (cursorX) => {
                    drawScene(cursorX);
                },
                () => {
                    drawScene();
                }
            );
        }

        // Keyboard Navigation for Oceans
        window.addEventListener("keydown", async (event) => {
            if (dataset.navigationMode !== "oceans") return;

            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
                event.preventDefault();

                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    if (currentOceanIndex > 0) {
                        currentOceanIndex--;
                        updateDisplay();
                        renderOceanControls();
                    } else {
                        statusRegion.textContent = "Beginning of ocean regions reached.";
                    }
                } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    if (currentOceanIndex < oceanKeys.length - 1) {
                        currentOceanIndex++;
                        updateDisplay();
                        renderOceanControls();
                    } else {
                        statusRegion.textContent = "End of ocean regions reached.";
                    }
                }
            } else if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                playAudioStream();
            } else if (event.key === "Home") {
                event.preventDefault();
                currentOceanIndex = 0;
                AudioCore.playArrivalChime();
                updateDisplay();
                renderOceanControls();
            } else if (event.key.toLowerCase() === "m") {
                event.preventDefault();
                const isMuted = AudioCore.toggleMute();
                const muteBtn = document.getElementById("btnMute");
                if (muteBtn) {
                    muteBtn.textContent = isMuted ? "Unmute Synth (M)" : "Mute Synth (M)";
                    muteBtn.setAttribute("aria-pressed", isMuted ? "true" : "false");
                }
                statusRegion.textContent = isMuted ? "Synthesizer muted." : "Synthesizer unmuted.";
            }
        });

        // Global Control Panel Bindings
        document.getElementById("btnHome").addEventListener("click", () => {
            currentOceanIndex = 0;
            AudioCore.playArrivalChime();
            updateDisplay();
            renderOceanControls();
        });

        document.getElementById("btnExit").addEventListener("click", () => {
            canvas.blur();
            statusRegion.textContent = "Exited map exploration.";
        });

        document.getElementById("btnMute").addEventListener("click", () => {
            const isMuted = AudioCore.toggleMute();
            const muteBtn = document.getElementById("btnMute");
            if (muteBtn) {
                muteBtn.textContent = isMuted ? "Unmute Synth (M)" : "Mute Synth (M)";
                muteBtn.setAttribute("aria-pressed", isMuted ? "true" : "false");
            }
        });

        document.getElementById("btnReplay").addEventListener("click", () => {
            playAudioStream();
        });

    } catch (error) {
        console.error("Error initializing ocean engine:", error);
    }
}