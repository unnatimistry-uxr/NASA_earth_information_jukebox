// js/app.js - Phase 2: Executive Summary & Audio Legend Generator (Zero Hardcoded Styles)

document.addEventListener("DOMContentLoaded", async () => {
    console.log("App initializing...");

    try {
        // 1. Fetch the master configuration from our paths utility
        const response = await fetch(window.PATHS.DATA.datasetsConfig);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 2. Identify the active dataset
        const activeKey = data.activeDataset;
        const dataset = data.datasets[activeKey];

        if (!dataset) {
            throw new Error(`Active dataset "${activeKey}" not found in config.`);
        }

        console.log("Loaded dataset successfully:", dataset.metadata.title);

        // 3. TIER 1: Inject Executive Summary into the ARIA Live Region
        const summaryBanner = document.getElementById("executiveSummary");
        if (summaryBanner) {
            summaryBanner.innerHTML = `
                <strong>${dataset.metadata.title}</strong><br>
                ${dataset.metadata.description} <em>(Source: ${dataset.metadata.source})</em>
            `;
        }

        // 4. Generate the Audio Legend Dynamically from JSON config
        renderAudioLegend(dataset.audioLegend);

    } catch (error) {
        console.error("Error loading application configuration:", error);
        const summaryBanner = document.getElementById("executiveSummary");
        if (summaryBanner) {
            summaryBanner.textContent = "Error loading dataset configuration. Please check local server paths.";
        }
    }
});

/**
 * Helper function to build the Audio Legend UI dynamically
 * Designed for screen-reader friendly flow (human descriptions first)
 * @param {Object} audioConfig - Audio legend settings from datasets.json
 */
function renderAudioLegend(audioConfig) {
    const legendContainer = document.getElementById("legendContainer");
    if (!legendContainer) return;

    // Render clean, accessible legend cards using 100% CSS classes
    legendContainer.innerHTML = `
        <div class="legend-item low">
            <strong>Low Stress Zone:</strong><br>
            <span>${audioConfig.lowDescription}</span>
            <div class="legend-subline">Tone scale starts at ${audioConfig.minFrequency} ${audioConfig.unit}</div>
        </div>
        <div class="legend-item high">
            <strong>High Nutrient Stress Zone:</strong><br>
            <span>${audioConfig.highDescription}</span>
            <div class="legend-subline">Tone scale reaches up to ${audioConfig.maxFrequency} ${audioConfig.unit}</div>
        </div>
    `;
}