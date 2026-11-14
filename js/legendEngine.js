// ==========================================================================
// js/legendEngine.js - Dynamic Accessible Audio-Visual Legend Engine
// ==========================================================================

function initLegendEngine(dataset) {
    const container = document.querySelector(".dynamic-legend-section");
    if (!container || !dataset.legendConfig) return;

    const config = dataset.legendConfig;
    const audioConfig = dataset.audioConfig || { minFrequency: 150, maxFrequency: 800, colorChannel: "red", scanDurationMs: 1500 };

    // 1. Clear container and build accessible wrapper
    container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "audio-legend-wrapper";
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", `${config.title}: Visual and Auditory Color Scale`);

    // 2. Title & Description
    const titleEl = document.createElement("h3");
    titleEl.textContent = config.title;
    wrapper.appendChild(titleEl);

    const descEl = document.createElement("p");
    descEl.className = "legend-desc";
    descEl.textContent = `Color scale ranging from ${config.minLabel} to ${config.maxLabel} measured in ${config.unit}. Tab to the color bar and press Spacebar to hear the audio gradient sweep.`;
    wrapper.appendChild(descEl);

    // 3. Visual Gradient Bar Container
    const barContainer = document.createElement("div");
    barContainer.className = "legend-gradient-bar";
    barContainer.tabIndex = 0; 
    barContainer.setAttribute("role", "slider");
    barContainer.setAttribute("aria-valuemin", config.colorStops[0].value);
    barContainer.setAttribute("aria-valuemax", config.colorStops[config.colorStops.length - 1].value);
    barContainer.setAttribute("aria-valuenow", config.colorStops[0].value);
    barContainer.setAttribute("aria-valuetext", `${config.colorStops[0].value} ${config.unit}, ${config.colorStops[0].desc}`);

    const gradientStopsString = config.colorStops
        .map(stop => `${stop.color} ${stop.position * 100}%`)
        .join(", ");
    
    barContainer.style.background = `linear-gradient(to right, ${gradientStopsString})`;

    // 4. Axis Labels
    const axisContainer = document.createElement("div");
    axisContainer.className = "legend-axis-labels";

    config.colorStops.forEach(stop => {
        const span = document.createElement("span");
        span.textContent = stop.value;
        axisContainer.appendChild(span);
    });

    wrapper.appendChild(barContainer);
    wrapper.appendChild(axisContainer);

    // Unit footer
    const unitFooter = document.createElement("div");
    unitFooter.className = "legend-unit-footer";
    unitFooter.textContent = config.unit;
    wrapper.appendChild(unitFooter);

    container.appendChild(wrapper);

    // 5. Trigger Audio Sweep using AudioCore safely
    async function playLegendSweep() {
        if (typeof AudioCore === "undefined") return;

        await AudioCore.scanLegendGradient(
            audioConfig, // <--- Unified audio configuration object
            (progress) => {
                const interpolatedVal = Number(
                    (config.colorStops[0].value + progress * (config.colorStops[config.colorStops.length - 1].value - config.colorStops[0].value)).toFixed(1)
                );
                barContainer.setAttribute("aria-valuenow", interpolatedVal);
                barContainer.setAttribute("aria-valuetext", `${interpolatedVal} ${config.unit}`);
            },
            () => {
                barContainer.setAttribute("aria-valuenow", config.colorStops[0].value);
            }
        );
    }

    barContainer.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            playLegendSweep();
        }
    });

    barContainer.addEventListener("click", () => {
        playLegendSweep();
    });
}