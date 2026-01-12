import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use relative paths for IPFS compatibility
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Inline small chunks (< 10KB) to reduce network request chains
        experimentalMinChunkSize: 10000,
      },
    },
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // Manual registration in main.tsx prevents render-blocking
      includeAssets: ["favicon.ico", "offline.html"],
      manifest: {
        name: "Zikalyze - AI Crypto Trading Analysis",
        short_name: "Zikalyze",
        description: "AI-powered cryptocurrency trading analysis with smart money concepts and real-time market insights",
        theme_color: "#0a0f1a",
        background_color: "#0a0f1a",
        display: "standalone",
        orientation: "portrait",
        scope: "./",
        start_url: "./",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.exchangerate-api\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "exchange-rates-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 // 1 hour
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
