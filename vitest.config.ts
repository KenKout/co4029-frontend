import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    css: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    env: {
      VITE_API_BASE_URL: "http://localhost:8000/api/v1",
    },
  },
  resolve: {
    alias: [
      // "@/i18n" must resolve BEFORE the bare "@" prefix rule and to the
      // synchronous test stub: the production module inits through an async
      // backend, and 1600+ tests import i18n and render immediately.
      { find: /^@\/i18n$/, replacement: path.resolve(__dirname, "./src/i18n/test-sync.ts") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});
