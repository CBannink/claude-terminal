import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

function waitForTauri(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.__TAURI_INTERNALS__) {
      resolve();
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.__TAURI_INTERNALS__) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error("Tauri IPC bridge not available after timeout"));
      }
    }, 10);
  });
}

waitForTauri()
  .then(() => {
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  })
  .catch((err) => {
    // Use textContent instead of innerHTML to prevent XSS
    const root = document.getElementById("root")!;
    const container = document.createElement("div");
    container.style.cssText = "display:flex;align-items:center;justify-content:center;height:100vh;background:#09090b;color:#ef4444;font-family:monospace;padding:2rem;text-align:center";
    const inner = document.createElement("div");
    const h1 = document.createElement("h1");
    h1.style.cssText = "font-size:1.25rem;margin-bottom:0.5rem";
    h1.textContent = "Failed to initialize";
    const p = document.createElement("p");
    p.style.cssText = "color:#a1a1aa;font-size:0.875rem";
    p.textContent = err instanceof Error ? err.message : String(err);
    inner.appendChild(h1);
    inner.appendChild(p);
    container.appendChild(inner);
    root.appendChild(container);
  });
