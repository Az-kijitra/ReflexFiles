import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [sveltekit()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1422,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1423,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  // Avoid first-use dependency optimization reloads during E2E runs.
  optimizeDeps: {
    include: [
      "@tauri-apps/api/app",
      "@tauri-apps/api/core",
      "@tauri-apps/api/event",
      "@tauri-apps/api/path",
      "@tauri-apps/api/window",
      "@tauri-apps/plugin-opener",
      "markdown-it",
      "highlight.js/lib/core",
      "highlight.js/lib/languages/c",
      "highlight.js/lib/languages/cpp",
      "highlight.js/lib/languages/rust",
      "highlight.js/lib/languages/javascript",
      "highlight.js/lib/languages/typescript",
      "highlight.js/lib/languages/python",
      "highlight.js/lib/languages/json",
      "highlight.js/lib/languages/markdown",
    ],
  },
}));
