# The Earth Information Jukebox

> **NASA Space Apps Challenge · Earth Information Center**  
> Turning NASA Earth science observations into spatial audio and keyboard-driven experiences for blind and low-vision explorers.

## Challenge
NASA’s Earth Information Center (EIC) produces stunning visualizations of our changing planet, but presenting Earth science through visualization alone limits who can reach it. We invite you to make this complex Earth science accessible, engaging, and multi-sensory by translating sight into sound. Your challenge is to build an "Earth Jukebox"—an interface, script, or application that pairs EIC visual frames with dynamic sonifications generated in real time.


---

## The Problem

Climate, air quality, wildfire, and ocean health data reach the public almost exclusively through visual colour maps and satellite imagery. Traditional screen readers and standard alt text fall short when it comes to exploratory data science—they cannot convey localized peaks, spatial distribution, or multi-region comparisons. 

This creates a significant barrier, shutting out students, researchers, and citizens who are blind or have low vision from critical environmental information that directly affects their health and communities.

---

## Repository Architecture

This project is structured with a clean, modular design system adhering to WCAG accessibility guidelines. Below is an overview of the core files in the repository and their responsibilities:

*   **`index.html`**  
    The primary landing page. It features a sticky navigation bar, a high-impact two-column hero section introducing the project, and an overview of available accessible datasets.
*   **`css/style.css`**  
    The centralized design system stylesheet. Built around a tokenized `:root` variable architecture, it manages the "paper-and-ink" aesthetic, typography rules (`Atkinson Hyperlegible`), color contrast standards, and multi-device responsive grid layouts.
*   **`ocean-stress.html`** *(Interactive Jukebox Page)*  
    The dedicated explorer interface for global ocean nutrient stress data. Includes live keyboard navigation handlers and dual-channel spatial audio sonification.
*   **`air-quality-co.html`** *(Interactive Jukebox Page)*  
    The dedicated explorer interface for carbon monoxide air quality data, translating pollutant concentrations into pitch variations across continental zones.
*   **`fires-viirs.html`** *(Interactive Jukebox Page)*  
    The dedicated explorer interface for active wildland fire detections via VIIRS satellite data, allowing users to scan thermal anomalies by ear.
*   **`assets/images/`**  
    Contains optimized NASA visualization thumbnails, plate graphics, and raster maps used across the landing page and dataset explorers.

---

## Running the Project Locally

Follow these simple steps to run the Earth Information Jukebox locally on your machine:

1. **Clone or Download the Repository:**
   Ensure all files, including your HTML pages, stylesheets, and asset directories, are saved in your local workspace folder.

2. **Open with a Local Development Server:**
   Because the project relies on standard web assets and local media referencing, it is best viewed via a local server (such as the **Live Server** extension in Visual Studio Code):
   * Open the project folder in VS Code.
   * Right-click on `index.html`.
   * Select **"Open with Live Server"**.

3. **Explore via Browser:**
   Your default web browser will automatically open `http://127.0.0.1:5500` (or your local server port), displaying the fully responsive, accessible landing page. Put on your headphones and use your keyboard (`Arrow keys`, `Spacebar`, `Tab`) to navigate and experience the data!