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
        name: "BASE — Minimal Performance",
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
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
      },
    }),
  ],
});
