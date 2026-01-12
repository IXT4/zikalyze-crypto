import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

// Register service worker for offline caching (must respect Vite base "./" for preview/IPFS)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Use BASE_URL so SW works on preview domains, subpaths, and IPFS builds
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log("SW registered:", registration.scope);

        // Proactively check for updates (prevents stale cached JS -> no live streaming)
        registration.update().catch(() => {});

        // Reload once when a new SW takes control
        let reloaded = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        });
      })
      .catch((error) => {
        console.log("SW registration failed:", error);
      });
  });
}

const container = document.getElementById("root")!;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
