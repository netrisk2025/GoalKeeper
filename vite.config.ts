import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    // Minimize inotify/FD use: default soft ulimit is often 1024 (EMFILE).
    // Only watch sources; ignore heavy / non-source trees.
    watch: {
      ignored: [
        "**/node_modules/**",
        "**/dist/**",
        "**/dist-ssr/**",
        "**/.git/**",
        "**/src-tauri/**",
        "**/Docs/**",
        "**/Assets/**",
        "**/examples/**",
        "**/coverage/**",
        "**/.vite/**",
      ],
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
