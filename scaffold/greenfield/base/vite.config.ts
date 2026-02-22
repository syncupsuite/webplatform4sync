import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    cloudflare(),
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          /**
           * Consolidate all React-dependent packages into a single chunk.
           * This prevents multiple React instances from loading, which causes
           * hooks and context errors. Battle-tested pattern from BrandSyncUp.
           *
           * DO NOT modify without understanding bundling implications.
           */
          "vendor-react": [
            "react",
            "react-dom",
            "react-router",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
