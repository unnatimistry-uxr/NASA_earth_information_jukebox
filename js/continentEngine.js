// ==========================================================================
// js/continentEngine.js - Dynamic Continent Navigation Engine (WCAG Accessible)
// ==========================================================================
// This engine handles 7-continent exploration. 
// Region coordinates, button labels, and narrations are entirely JSON-driven.
// ==========================================================================

//document.addEventListener("DOMContentLoaded", () => {
    initContinentEngine();
//});

async function initContinentEngine() {
    try {
        // 1. Fetch master dataset configuration from JSON
        const response = await fetch(window.PATHS.DATA.datasetsConfig);
        if (!response.ok) throw new Error("Failed to load dataset configuration.");
        
        const data = await response.json();
        // Replace: const dataset = data.datasets[data.activeDataset];
        // With:
        const activeKey = window.TARGET_DATASET || data.activeDataset;
        const dataset = data.datasets[activeKey];

        // Ensure this dataset is meant for continent navigation before running
        if (dataset.navigationMode !== "continents") {
            console.log("Dataset navigationMode is not 'continents'. Skipping continentEngine.");
            return;
        }

        // 2. Grab DOM elements
        const canvas = document.getElementById("mapCanvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const statusRegion = document.getElementById("statusRegion");
        const dynamicNavControls = document.getElementById("dynamicNavControls");

        // 3. Set canvas dimensions from JSON config
        canvas.width = dataset.canvasSettings.width;
        canvas.height = dataset.canvasSettings.height;

        // 4. Extract design system colors from CSS root variables
        const computedStyle = getComputedStyle(document.documentElement);
        const focusRingColor = computedStyle.getPropertyValue('--focus-ring').trim() || '#facc15';
        const cursorLineColor = computedStyle.getPropertyValue('--cursor-line').trim() || '#38bdf8';

        // 5. Initialize Universal Synthesizer using AudioCore
        AudioCore.initSynth(dataset.synthSettings);

        // 6. Load Map Image Asset
        const mapImage = new Image();
        mapImage.src = dataset.paths.image;

        mapImage.onload = () => {
            ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
            drawScene(); // Draw initial focus box
            statusRegion.textContent = "Continent navigation loaded. Select a continent button or use arrow keys.";
        };

        // 7. Continent State Setup
        const continentKeys = Object.keys(dataset.continentRegions || {});
        let currentContinentIndex = 0; // Starts at the first continent key

        /**
         * Helper: Gets the key of the currently selected continent
         */
        function getCurrentContinentKey() {
            return continentKeys[currentContinentIndex];
        }

        /**
         * Helper: Retrieves metadata and bounding boxes for the active continent
         */
        function getCurrentContinentInfo() {
            const key = getCurrentContinentKey();
            return dataset.continentRegions[key] || {
                name: "Unknown Continent",
                narration: "Continent region.",
                boxes: []
            };
        }

        /**
         * 8. Render Scene & Active Focus Ring
         * Redraws the map image and draws the yellow focus border around the active continent.
         * @param {number|null} cursorX - Current scanning X pixel line, or null if stationary
         */
        function drawScene(cursorX = null) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

            const continentInfo = getCurrentContinentInfo();
            const boxes = continentInfo.boxes || [];

            // Draw bounding box focus outline(s) for the current continent
            boxes.forEach(box => {
                ctx.strokeStyle = focusRingColor;
                ctx.lineWidth = 4;
                ctx.strokeRect(Number(box.x) || 0, Number(box.y) || 0, Number(box.w) || Number(box.width) || 0, Number(box.h) || Number(box.height) || 0);
            });

            // If audio scanning is active, draw the vertical cyan cursor line
            if (cursorX !== null && boxes.length > 0) {
                const activeBox = boxes[0];
                const boxX = Math.floor(Number(activeBox.x) || 0);
                const boxY = Math.floor(Number(activeBox.y) || 0);
                const boxH = Math.floor(Number(activeBox.height) || Number(activeBox.h) || 0);

                ctx.strokeStyle = cursorLineColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(Math.floor(cursorX), boxY);
                ctx.lineTo(Math.floor(cursorX), boxY + boxH);
                ctx.stroke();
            }
        }

        /**
         * Updates live screen reader status and refreshes visual canvas
         */
        function updateDisplay() {
            const continentInfo = getCurrentContinentInfo();
            statusRegion.textContent = continentInfo.narration;
            drawScene();
        }

        /**
         * 9. Dynamic UI Control Generator (Text-only, WCAG compliant, zero icons)
         * Generates quick-jump buttons for all 7 continents inside the control panel.
         */
        function renderContinentControls() {
            if (!dynamicNavControls) return;
            dynamicNavControls.innerHTML = "";

            const fieldset = document.createElement("fieldset");
            const legend = document.createElement("legend");
            legend.textContent = "Continent Region Selection";
            fieldset.appendChild(legend);

            continentKeys.forEach((key, index) => {
                const continent = dataset.continentRegions[key];
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "control-btn";
                btn.textContent = continent.name;
                btn.setAttribute("aria-label", `Select ${continent.name}`);
                
                // Highlight active button state using ARIA
                if (index === currentContinentIndex) {
                    btn.setAttribute("aria-pressed", "true");
                } else {
                    btn.setAttribute("aria-pressed", "false");
                }

                // Click event listener to jump directly to this continent
                btn.addEventListener("click", () => {
                    currentContinentIndex = index;
                    updateDisplay();
                    renderContinentControls(); // Refresh button aria-pressed states
                });

                fieldset.appendChild(btn);
            });

            dynamicNavControls.appendChild(fieldset);
        }

        // Initial render of UI control buttons
        renderContinentControls();

        /**
         * 10. Trigger Audio Sonification Stream using AudioCore
         */
        async function playAudioStream() {
            const continentInfo = getCurrentContinentInfo();
            const boxes = continentInfo.boxes || [];

            await AudioCore.scanBoundingBoxes(
                ctx,
                boxes,
                dataset.audioConfig,
                (cursorX) => {
                    // On every pixel tick, update visual cursor line
                    drawScene(cursorX);
                },
                () => {
                    // On scan completion, reset canvas focus box
                    drawScene();
                }
            );
        }

        // 11. Keyboard Event Listeners for Map Accessibility
        window.addEventListener("keydown", async (event) => {
            if (dataset.navigationMode !== "continents") return;

            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
                event.preventDefault();

                // Left/Up moves backward through continents
                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    if (currentContinentIndex > 0) {
                        currentContinentIndex--;
                        updateDisplay();
                        renderContinentControls();
                    } else {
                        statusRegion.textContent = "Beginning of continent regions reached.";
                    }
                } 
                // Right/Down moves forward through continents
                else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    if (currentContinentIndex < continentKeys.length - 1) {
                        currentContinentIndex++;
                        updateDisplay();
                        renderContinentControls();
                    } else {
                        statusRegion.textContent = "End of continent regions reached.";
                    }
                }
            } 
            else if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                playAudioStream();
            } 
            else if (event.key === "Home") {
                event.preventDefault();
                currentContinentIndex = 0;
                statusRegion.textContent = "Returned to origin continent.";
                AudioCore.playArrivalChime();
                updateDisplay();
                renderContinentControls();
            } 
            else if (event.key.toLowerCase() === "m") {
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

        // 12. Global Control Panel Event Bindings
        document.getElementById("btnHome").addEventListener("click", () => {
            currentContinentIndex = 0;
            AudioCore.playArrivalChime();
            updateDisplay();
            renderContinentControls();
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
        console.error("Error initializing continent engine:", error);
    }
}