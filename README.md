# 🌐 Snake 404 — Server Glitch Edition

A retro-cyberpunk arcade game built with **HTML5 Canvas, Vanilla CSS, and JavaScript**, themed around web browsing environments, network packets, and HTTP status codes.

---

## 🎮 Concept & Gameplay

You steer a data stream (snake) through a simulated web browser workspace. Instead of eating apples, your job is to process incoming status code packets to compile code, while avoiding firewalls and recovering from server-side anomalies.

### 📥 Status Code Packets Legend
*   **🟢 200 OK:** Standard data packet. Adds +10 to score, increases data stream length (+1 segment), and accelerates tick rate.
*   **⚡ 404 Not Found:** Glitched cache file. Multiplies score, but inverts key inputs and triggers heavy screen shaking/visual noise for 5 seconds.
*   **🌀 301 Redirect:** Permanent relocation. Instantly redirects (teleports) your head node to a random empty grid cell without changing stream length.
*   **🚫 403 Forbidden:** Firewall node. Colliding with these dynamically spawned red barriers results in immediate access termination (Game Over).
*   **🔵 500 Server Error:** Fatal server anomaly. Triggers a Blue Screen of Death (BSOD) recovery progress bar. The system auto-recovers after 2 seconds but flushes cache, shrinking your stream by 3 segments and resetting current speed modifiers.

---

## 🛠️ Features

*   **Simulated Browser Shell:** The game renders inside a mockup browser wrapper, complete with navigation control buttons and a stateful Address Bar that updates its URL as your game state changes.
*   **Built-in DevTools Panel:**
    *   **Console:** Outputs real-time compiler warnings, status logs, and supports console execution commands.
    *   **Network:** Traces HTTP request parameters, sizes, and latency mockups for every eaten packet.
    *   **Performance:** Displays active frame rates (FPS), tick latency (ms/tick), multiplier values, and memory overhead simulations.
*   **Web Audio Synth Engine:** Low-latency synthesized retro sound effects created programmatically via the **Web Audio API** (no heavy external assets required).
*   **Falling Code Matrix:** Cyberpunk binary falling digits and glowing trails rendered directly onto the background grid.

---

## 🚀 Running Locally

### Prerequisites
*   [Node.js](https://nodejs.org/) (v16.0.0 or higher recommended)

### Quick Start
1. Clone the repository and navigate to the project directory:
   ```bash
   cd Snake404
   ```
2. Install the dev dependencies:
   ```bash
   npm install
   ```
3. Boot the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to: **`http://localhost:3000/`**

---

## 🧪 Developer Command Cheats

You can execute debug commands directly inside the **DevTools Console** tab input line:

*   `/help` — Lists all available console commands.
*   `/god` — Toggles invincibility mode (lets you navigate through your own body and `403 Forbidden` firewalls).
*   `/speed <ms>` — Adjusts the clock speed of game ticks directly (e.g. `/speed 100` makes the snake move faster, bounds: 40-500ms).
*   `/spawn <status>` — Instantly spawns a packet of the specified status code on the grid (supported values: `200`, `301`, `404`, `500`, `403`).
*   `/clear` — Clears all console logs.

---

## 📦 Deployment & Publishing

### Compile for Production
To bundle the assets into a high-performance static folder (`dist/`):
```bash
npm run build
```

### Deploying to Itch.io (HTML5 Play in Browser)
1. Zip the contents inside the generated `dist/` directory (ensure `index.html` is at the root level of the ZIP archive).
2. Create a project on Itch.io and set the **Kind of project** to **HTML**.
3. Upload the ZIP file and check the box *"This file will be played in the browser"*.
4. Under Embed settings, manually set viewport size to **Width: 1100px** and **Height: 750px**.
