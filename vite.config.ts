import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  build: { target: "safari15" },
  plugins: [
    react(),
    tailwind(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        name: "BASE. 3.1 – Refinement",
        short_name: "BASE.",
        display: "standalone",
        start_url: "/",
        theme_color: "#101113",
        background_color: "#101113",
        icons: [
          { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icons/base-layers-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icons/base-layers-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/recovery\.html$/],
        skipWaiting: false,
        clientsClaim: true,
        globIgnores: ['**/rep-tracker/**'],
        runtimeCaching: [{
          urlPattern: ({url})=>url.origin===self.location.origin&&url.pathname.startsWith('/rep-tracker/vision-1.2.3-face-1/'),
          handler: 'CacheFirst',
          options: {cacheName:'base-rep-model-vision-1.2.3-face-1',cacheableResponse:{statuses:[200]},expiration:{maxEntries:8,maxAgeSeconds:31536000}}
        }],
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
      },
    }),
  ],
});
