// ==========================================================================
// js/app.js - Master Orchestrator & Dynamic Engine Bootstrapper
// ==========================================================================
// Fetches datasets.json, reads the active dataset and its navigationMode,
// updates global metadata, summary, initializes the audio legend, and 
// dynamically boots up the correct engine script.
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

async function initApp() {
    try {
        console.log("App initializing...");

        // 1. Fetch master dataset configuration using centralized paths registry
        const response = await fetch(window.PATHS.DATA.datasetsConfig);
        if (!response.ok) throw new Error("Failed to load dataset configuration.");
        
        const data = await response.json();
        
        // 2. Identify the active dataset object based on activeDataset pointer
        const activeDatasetKey = data.activeDataset;
        const dataset = data.datasets[activeDatasetKey];

        if (!dataset) {
            throw new Error(`Active dataset "${activeDatasetKey}" not found in configuration.`);
        }

        console.log(`Loaded dataset successfully: ${dataset.metadata.title}`);

        // 3. Populate global metadata in the DOM (Title & Description if elements exist)
        const titleElement = document.getElementById("datasetTitle");
        if (titleElement) {
            titleElement.textContent = dataset.metadata.title;
        }

        const descElement = document.getElementById("datasetDescription");
        if (descElement) {
            descElement.textContent = dataset.metadata.description;
        }

        // Populate Executive Summary container
        const summaryElement = document.getElementById("datasetSummary");
        if (summaryElement) {
            summaryElement.textContent = dataset.metadata.description;
        }

        // Initialize Accessible Audio Legend using legendEngine.js
        if (typeof initLegendEngine === "function") {
            initLegendEngine(dataset);
        }

        // 4. Determine navigation mode ("grid", "oceans", or "continents") from JSON
        const navMode = dataset.navigationMode;
        console.log(`Active navigation mode detected: "${navMode}"`);

        // 5. Dynamically load and execute the correct engine script based on navigationMode
        loadEngineScript(navMode);

    } catch (error) {
        console.error("Error initializing app orchestrator:", error);
        const statusRegion = document.getElementById("statusRegion");
        if (statusRegion) {
            statusRegion.textContent = "Error loading dataset configuration. Please check console.";
        }
    }
}

/**
 * Dynamically injects the appropriate navigation engine script tag into the document body
 * @param {string} mode - The navigation mode ("grid", "oceans", or "continents")
 */
function loadEngineScript(mode) {
    let scriptSrc = "";

    // Map navigation mode string to its respective script path from PATHS registry
    switch (mode) {
        case "grid":
            scriptSrc = window.PATHS.SCRIPTS.gridEngine;
            break;
        case "oceans":
            scriptSrc = window.PATHS.SCRIPTS.oceanEngine;
            break;
        case "continents":
            scriptSrc = window.PATHS.SCRIPTS.continentEngine;
            break;
        default:
            console.error(`Unknown navigation mode: "${mode}"`);
            return;
    }

    // Create a new script element dynamically
    const engineScript = document.createElement("script");
    engineScript.src = scriptSrc;
    engineScript.async = true;

    // Log successful script boot
    engineScript.onload = () => {
        console.log(`Successfully booted engine script for mode: "${mode}"`);
    };

    // Log error if script fails to load
    engineScript.onerror = () => {
        console.error(`Failed to load engine script: ${scriptSrc}`);
    };

    // Append script to document body to execute it immediately
    document.body.appendChild(engineScript);
}