// ==========================================================================
// js/legendEngine.js - Dynamic Accessible Audio-Visual Legend Engine
// ==========================================================================

function initLegendEngine(dataset) {
    const container = document.getElementById("dynamicLegendContainer");
    if (!container || !dataset.legendConfig) return;

    const config = dataset.legendConfig;
    const audioConfig = dataset.audioLegend;

    // 1. Clear container and build accessible wrapper
    container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "audio-legend-wrapper";
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", `${config.title}: Visual and Auditory Color Scale`);
    wrapper.style.marginBottom = "1.5rem";
    wrapper.style.padding = "1rem";
    wrapper.style.backgroundColor = "var(--bg-secondary, #1e293b)";
    wrapper.style.borderRadius = "8px";
    wrapper.style.border = "1px solid rgba(148, 163, 184, 0.2)";

    // 2. Title & Description
    const titleEl = document.createElement("h3");
    titleEl.textContent = config.title;
    titleEl.style.fontSize = "1.1rem";
    titleEl.style.marginBottom = "0.5rem";
    wrapper.appendChild(titleEl);

    const descEl = document.createElement("p");
    descEl.className = "legend-desc";
    descEl.textContent = `Color scale ranging from ${config.minLabel} to ${config.maxLabel} measured in ${config.unit}. Tab to the color bar and press Spacebar to hear the audio gradient sweep.`;
    descEl.style.fontSize = "0.85rem";
    descEl.style.color = "var(--text-secondary, #94a3b8)";
    descEl.style.marginBottom = "1rem";
    wrapper.appendChild(descEl);

    // 3. Visual Gradient Bar Container (Fully interactive and focusable)
    const barContainer = document.createElement("div");
    barContainer.className = "legend-gradient-bar";
    barContainer.tabIndex = 0; // Ensures it is fully reachable via the Tab key
    barContainer.setAttribute("role", "slider");
    barContainer.setAttribute("aria-valuemin", config.colorStops[0].value);
    barContainer.setAttribute("aria-valuemax", config.colorStops[config.colorStops.length - 1].value);
    barContainer.setAttribute("aria-valuenow", config.colorStops[0].value);
    barContainer.setAttribute("aria-valuetext", `${config.colorStops[0].value} ${config.unit}, Low stress`);

    // Construct CSS linear-gradient string dynamically from JSON colorStops
    const gradientStopsString = config.colorStops
        .map(stop => `${stop.color} ${stop.position * 100}%`)
        .join(", ");
    
    barContainer.style.background = `linear-gradient(to right, ${gradientStopsString})`;
    barContainer.style.height = "36px";
    barContainer.style.width = "100%"; // Fixes collapse issue, ensuring full mouse/tab target area
    barContainer.style.borderRadius = "6px";
    barContainer.style.position = "relative";
    barContainer.style.cursor = "pointer";
    barContainer.style.outlineOffset = "2px";

    // 4. Axis Labels
    const axisContainer = document.createElement("div");
    axisContainer.className = "legend-axis-labels";
    axisContainer.style.display = "flex";
    axisContainer.style.justifyContent = "space-between";
    axisContainer.style.marginTop = "8px";
    axisContainer.style.fontSize = "0.8rem";
    axisContainer.style.color = "var(--text-secondary, #94a3b8)";

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
    unitFooter.style.textAlign = "center";
    unitFooter.style.marginTop = "6px";
    unitFooter.style.fontSize = "0.75rem";
    unitFooter.style.fontStyle = "italic";
    unitFooter.style.color = "var(--text-secondary, #94a3b8)";
    unitFooter.textContent = config.unit;
    wrapper.appendChild(unitFooter);

    container.appendChild(wrapper);

    // 5. Trigger Audio Sweep using AudioCore safely
    async function playLegendSweep() {
        if (typeof AudioCore === "undefined") return;

        await AudioCore.scanLegendGradient(
            audioConfig,
            (progress) => {
                const interpolatedVal = Number(
                    (config.colorStops[0].value + progress * (config.colorStops[config.colorStops.length - 1].value - config.colorStops[0].value)).toFixed(1)
                );
                barContainer.setAttribute("aria-valuenow", interpolatedVal);
                barContainer.setAttribute("aria-valuetext", `${interpolatedVal} ${config.unit}`);
            },
            () => {
                // Reset ARIA value on complete
                barContainer.setAttribute("aria-valuenow", config.colorStops[0].value);
            }
        );
    }

    // Keyboard & Mouse Event Listeners
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