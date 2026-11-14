// ==========================================================================
// js/audioCore.js - Universal Audio Sonification & Color-to-Pitch Engine
// ==========================================================================

const AudioCore = (() => {
    let synth = null;
    let isMuted = false;

    /**
     * 1. Initialize Tone.js Synthesizer from JSON dataset settings
     * @param {Object} synthSettings - Oscillator & envelope config from JSON
     */
    function initSynth(synthSettings) {
        if (synth) {
            synth.dispose();
        }
        synth = new Tone.Synth({
            oscillator: { type: synthSettings.oscillatorType || "sine" },
            envelope: synthSettings.envelope || {
                attack: 0.05,
                decay: 0.1,
                sustain: 0.2,
                release: 0.3
            }
        }).toDestination();

        synth.volume.value = isMuted ? -Infinity : 0;
    }

    /**
     * 2. Toggle Mute State (Syncs synth volume and WCAG aria-pressed state)
     * @returns {boolean} Current mute state
     */
    function toggleMute() {
        isMuted = !isMuted;
        if (synth) {
            synth.volume.value = isMuted ? -Infinity : 0;
        }
        return isMuted;
    }

    function getMuteState() {
        return isMuted;
    }

    /**
     * 3. Universal Color-to-Pitch Calculator
     * Extracts normalized intensity (0.0 to 1.0) based on JSON colorChannel rule
     * @param {Uint8ClampedArray} rgba - [R, G, B, A] pixel data from canvas
     * @param {Object} audioConfig - { minFrequency, maxFrequency, colorChannel }
     * @returns {number} Calculated frequency in Hz
     */
    function pixelToFrequency(rgba, audioConfig) {
        const r = rgba[0];
        const g = rgba[1];
        const b = rgba[2];
        const channel = (audioConfig.colorChannel || "red").toLowerCase();

        let normalizedValue = 0;

        switch (channel) {
            case "red":
                normalizedValue = r / 255;
                break;
            case "green":
                normalizedValue = g / 255;
                break;
            case "blue":
                normalizedValue = b / 255;
                break;
            case "luminance":
                // Standard perceived brightness formula (Rec. 709)
                normalizedValue = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                break;
            default:
                normalizedValue = r / 255;
        }

        const minFreq = audioConfig.minFrequency || 150;
        const maxFreq = audioConfig.maxFrequency || 850;

        // --- THRESHOLD GATING FOR CLEAR DISTINCTION ---
        // If the color intensity is below 40% (background clouds, terrain, normal land),
        // keep it locked to the low baseline frequency so it sounds clean and structured.
        if (normalizedValue < 0.4) {
            return minFreq; 
        }

        // For values above 40% (entering fire/stress zones), scale sharply up to max frequency
        const weightedValue = Math.pow((normalizedValue - 0.4) / 0.6, 1.5);
        return minFreq + weightedValue * (maxFreq - minFreq);
    }

    /**
     * 4. Pleasant Two-Tone Arrival Chime (Used for Home / Origin reset)
     */
    async function playArrivalChime() {
        if (isMuted || !synth) return;
        if (Tone.context.state !== "running") {
            await Tone.start();
        }
        synth.triggerAttackRelease("523.25", "8n"); // C5
        setTimeout(() => {
            if (!isMuted && synth) {
                synth.triggerAttackRelease("783.99", "8n"); // G5
            }
        }, 150);
    }

    /**
     * Sequential Multi-Box Pixel-by-Pixel Audio Scanner with Noise Filtering.
     * 
     * Sound Engineering Architecture:
     * - Downsamples spatial scanning (sampling every 4 pixels) to eliminate 
     *   high-frequency visual jitter, cloud artifacts, and audio static.
     * - Implements temporal frequency smoothing (rampTo) to prevent jarring 
     *   clicks and create a soothing, legible melodic contour for BLV researchers.
     * 
     * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the map canvas.
     * @param {Array<Object>} boxes - Array of bounding regions [{x, y, w, h}] supporting split/wrapped features.
     * @param {Object} audioConfig - Unified audio configuration object ({ minFrequency, maxFrequency, colorChannel, scanDurationMs }).
     * @param {Function} [onCursorMove] - Optional callback triggered on each scan step, returning current X coordinate and active box.
     * @param {Function} [onScanComplete] - Optional callback triggered when the full multi-box sweep finishes.
     */
    async function scanBoundingBoxes(ctx, boxes, audioConfig, onCursorMove, onScanComplete) {
        if (isMuted || !synth || !boxes || boxes.length === 0) return;

        if (Tone.context.state !== "running") {
            await Tone.start();
        }

        const totalDurationMs = audioConfig.scanDurationMs || 3000;
        const totalPixelWidth = boxes.reduce((sum, box) => sum + Math.floor(Number(box.width) || Number(box.w) || 0), 0);
        if (totalPixelWidth <= 0) return;

        // SOUND ENGINEERING UPGRADE: Downsample sampling step to every 4 pixels 
        // to completely eliminate high-frequency pixel jitter and noise.
        const sampleStep = 4; 
        const totalSteps = Math.floor(totalPixelWidth / sampleStep);
        const timePerStepMs = totalDurationMs / totalSteps;

        synth.triggerAttack(audioConfig.minFrequency || 90);

        for (let b = 0; b < boxes.length; b++) {
            const box = boxes[b];
            const startX = Math.floor(Number(box.x) || 0);
            const boxWidth = Math.floor(Number(box.width) || Number(box.w) || 0);
            const endX = startX + boxWidth;
            const currentY = Math.floor(Number(box.y) || 0);
            const currentH = Math.floor(Number(box.height) || Number(box.h) || 0);
            const sampleY = Math.floor(currentY + (currentH / 2));

            for (let scanX = startX; scanX < endX; scanX += sampleStep) {
                const safeX = Math.floor(Number(scanX));
                const pixelData = ctx.getImageData(safeX, sampleY, 1, 1).data;
                const freq = pixelToFrequency(pixelData, audioConfig);

                // SOUND ENGINEERING UPGRADE: Smooth glide rate matching step time 
                // to eliminate harsh clicking and create a flowing, organic tone.
                synth.frequency.rampTo(freq, (timePerStepMs * 1.5) / 1000);

                if (typeof onCursorMove === "function") {
                    onCursorMove(safeX, box);
                }

                await new Promise(resolve => setTimeout(resolve, timePerStepMs));
            }
        }

        synth.triggerRelease();
        if (typeof onScanComplete === "function") {
            onScanComplete();
        }
    }


    /**
     * Scan a color gradient legend from min to max frequency
     * @param {Object} audioConfig - { minFrequency, maxFrequency, scanDurationMs }
     * @param {Function} onProgress - Callback updating UI/ARIA values during sweep
     * @param {Function} onComplete - Callback when sweep finishes
     */
    async function scanLegendGradient(audioConfig, onProgress, onComplete) {
        if (isMuted || !synth) return;

        if (Tone.context.state !== "running") {
            await Tone.start();
        }

        const totalSteps = 40;
        const durationMs = audioConfig.scanDurationMs || 1500;
        const stepTime = durationMs / totalSteps;

        const minFreq = audioConfig.minFrequency || 150;
        const maxFreq = audioConfig.maxFrequency || 800;

        for (let i = 0; i <= totalSteps; i++) {
            const progress = i / totalSteps;
            const freq = minFreq + progress * (maxFreq - minFreq);

            if (i === 0) {
                synth.triggerAttack(freq);
            } else {
                synth.frequency.rampTo(freq, stepTime / 1000);
            }

            if (typeof onProgress === "function") {
                onProgress(progress);
            }

            await new Promise(resolve => setTimeout(resolve, stepTime));
        }

        synth.triggerRelease();
        if (typeof onComplete === "function") {
            onComplete();
        }
    }

    // Expose clean public API
    return {
        initSynth,
        toggleMute,
        getMuteState,
        pixelToFrequency,
        playArrivalChime,
        scanBoundingBoxes,
        scanLegendGradient
    };
})();

window.AudioCore = AudioCore;