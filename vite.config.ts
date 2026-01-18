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
    // Increase chunk size limit to reduce small chunks
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Aggressive inlining - inline all chunks under 20KB
        experimentalMinChunkSize: 20000,
        // Strategic chunking to eliminate dependency chains
        manualChunks(id) {
          // Force ALL lucide-react icons into a single chunk (eliminates 6+ separate icon files)
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          // Keep large vendor libraries in dedicated chunks
          if (id.includes('node_modules')) {
            // Charts library - large, rarely changes
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts';
            }
            // UI framework - core Radix components
            if (id.includes('@radix-ui')) {
              return 'ui';
            }
            // React core and router
            if (id.includes('react-router') || id.includes('react-dom')) {
              return 'react';
            }
            // Supabase SDK
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Three.js (3D graphics)
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three';
            }
          }
        },
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
