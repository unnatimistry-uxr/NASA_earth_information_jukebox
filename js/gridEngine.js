// ==========================================================================
// js/gridEngine.js - Dynamic Grid Navigation Engine (WCAG Accessible)
// ==========================================================================
// This engine handles grid-based exploration (e.g., 4x2, 3x3). 
// Grid dimensions, cell narrations, and bounding boxes are entirely JSON-driven.
// ==========================================================================

//document.addEventListener("DOMContentLoaded", () => {
    initGridEngine();
//});

async function initGridEngine() {
    try {
        // 1. Fetch master dataset configuration
        const response = await fetch(window.PATHS.DATA.datasetsConfig);
        if (!response.ok) throw new Error("Failed to load dataset configuration.");
        
        const data = await response.json();
        // Replace: const dataset = data.datasets[data.activeDataset];
        // With:
        const activeKey = window.TARGET_DATASET || data.activeDataset;
        const dataset = data.datasets[activeKey];

        // Ensure this dataset is meant for grid navigation before running
        if (dataset.navigationMode !== "grid") {
            console.log("Dataset navigationMode is not 'grid'. Skipping gridEngine.");
            return;
        }

        // 2. Grab DOM elements
        const canvas = document.getElementById("mapCanvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const statusRegion = document.getElementById("statusRegion");
        const dynamicNavControls = document.getElementById("dynamicNavControls");

        // 3. Set canvas dimensions from JSON configuration
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
            statusRegion.textContent = "Grid navigation loaded. Use Arrow Keys to explore cells, Spacebar to hear audio stream.";
        };

        // 7. Grid State Variables (Dynamic sizing from JSON)
        const cols = dataset.gridSettings.columns; // e.g., 4 columns
        const rows = dataset.gridSettings.rows;       // e.g., 2 rows
        const totalCells = cols * rows;             // Total interactive cells (e.g., 8)
        let currentIndex = 0;                       // Starts at top-left cell (index 0)

        /**
         * Helper: Converts a linear index (0 to totalCells-1) into (X, Y) grid coordinates
         * @param {number} index - Current linear cell index
         * @returns {Object} { x: column index, y: row index }
         */
        function getCoords(index) {
            return {
                x: index % cols,
                y: Math.floor(index / cols)
            };
        }

        /**
         * Helper: Retrieves metadata and narration for the currently selected cell
         * @returns {Object} Cell object containing name, narration, and bounding boxes
         */
        function getCurrentCellInfo() {
            const { x, y } = getCoords(currentIndex);
            const key = `${x},${y}`;
            
            // Fallback object if a specific coordinate key is missing in JSON
            return dataset.gridData[key] || {
                name: `Grid Cell ${x},${y}`,
                narration: `Selected grid zone at column ${x + 1}, row ${y + 1}.`,
                boxes: [{
                    x: (x * canvas.width) / cols,
                    y: (y * canvas.height) / rows,
                    w: canvas.width / cols,
                    h: canvas.height / rows
                }]
            };
        }

        /**
         * 8. Render Scene & Active Focus Ring
         * Redraws the map image and draws the yellow focus border around the active grid cell.
         * @param {number|null} cursorX - Current scanning X pixel line, or null if stationary
         */
        function drawScene(cursorX = null) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

            const cellInfo = getCurrentCellInfo();
            const boxes = cellInfo.boxes || [];

            // Draw bounding box focus outline(s) for the current cell
            boxes.forEach(box => {
                ctx.strokeStyle = focusRingColor;
                ctx.lineWidth = 4;
                ctx.strokeRect(box.x, box.y, box.w, box.h);
            });

            // If audio scanning is active, draw the vertical cyan cursor line
            if (cursorX !== null && boxes.length > 0) {
                const activeBox = boxes[0];
                ctx.strokeStyle = cursorLineColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cursorX, activeBox.y);
                ctx.lineTo(cursorX, activeBox.y + activeBox.h);
                ctx.stroke();
            }
        }

        /**
         * Updates live screen reader status and refreshes visual canvas
         */
        function updateDisplay() {
            const cellInfo = getCurrentCellInfo();
            statusRegion.textContent = cellInfo.narration;
            drawScene();
        }

        /**
         * 9. Dynamic UI Control Generator (Text-only, WCAG compliant, zero icons)
         * Generates quick-jump buttons for grid rows/cells inside the control panel.
         */
        function renderGridControls() {
            if (!dynamicNavControls) return;
            dynamicNavControls.innerHTML = "";

            const fieldset = document.createElement("fieldset");
            const legend = document.createElement("legend");
            legend.textContent = "Grid Zone Navigation";
            fieldset.appendChild(legend);

            // Create a button for each cell in the grid
            for (let i = 0; i < totalCells; i++) {
                const { x, y } = getCoords(i);
                const key = `${x},${y}`;
                const cellData = dataset.gridData[key] || { name: `Cell ${x+1},${y+1}` };

                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "control-btn";
                btn.textContent = cellData.name;
                btn.setAttribute("aria-label", `Navigate to ${cellData.name}`);
                
                // Highlight active button state
                if (i === currentIndex) {
                    btn.setAttribute("aria-pressed", "true");
                } else {
                    btn.setAttribute("aria-pressed", "false");
                }

                // Click event listener to jump directly to this grid cell
                btn.addEventListener("click", () => {
                    currentIndex = i;
                    updateDisplay();
                    renderGridControls(); // Re-render to update aria-pressed states
                });

                fieldset.appendChild(btn);
            }

            dynamicNavControls.appendChild(fieldset);
        }

        // Initial render of UI control buttons
        renderGridControls();

        /**
         * 10. Trigger Audio Sonification Stream using AudioCore
         */
        async function playAudioStream() {
            const cellInfo = getCurrentCellInfo();
            const boxes = cellInfo.boxes || [];

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
            // Only capture navigation keys when canvas or controls are focused
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
                event.preventDefault();

                // Left/Up moves backward through grid cells
                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    if (currentIndex > 0) {
                        currentIndex--;
                        updateDisplay();
                        renderGridControls();
                    } else {
                        statusRegion.textContent = "Beginning of grid map reached.";
                    }
                } 
                // Right/Down moves forward through grid cells
                else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    if (currentIndex < totalCells - 1) {
                        currentIndex++;
                        updateDisplay();
                        renderGridControls();
                    } else {
                        statusRegion.textContent = "End of grid map reached. Press End key to exit.";
                    }
                }
            } 
            else if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                playAudioStream();
            } 
            else if (event.key === "Home") {
                event.preventDefault();
                currentIndex = 0;
                statusRegion.textContent = "Returned to grid origin.";
                AudioCore.playArrivalChime();
                updateDisplay();
                renderGridControls();
            } 
            else if (event.key === "End" || event.key === "Escape") {
                event.preventDefault();
                canvas.blur();
                statusRegion.textContent = "Exited map exploration.";
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
            currentIndex = 0;
            AudioCore.playArrivalChime();
            updateDisplay();
            renderGridControls();
        });

        document.getElementById("btnExit").addEventListener("click", () => {
            canvas.blur();
            statusRegion.textContent = "Exited map exploration via control panel.";
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
        console.error("Error initializing grid engine:", error);
    }
}