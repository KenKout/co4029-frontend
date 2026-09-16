import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_PROXY_TARGET ?? "http://localhost:8000";
  const enableProxy = env.VITE_DEV_PROXY === "1" || mode === "test";
  const hmrHost = env.VITE_DEV_HMR_HOST;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      allowedHosts: ["abridgeai.tech", "abridgeai.hcmut.app"],
      hmr: hmrHost
        ? { host: hmrHost, protocol: "ws", clientPort: 5173 }
        : { host: "abridgeai.tech", protocol: "wss", clientPort: 443 },
      proxy: enableProxy
        ? {
            "/api/v1": { target: proxyTarget, changeOrigin: true },
            "/healthz": { target: proxyTarget, changeOrigin: true },
            "/readyz": { target: proxyTarget, changeOrigin: true },
          }
        : undefined,
    },
    preview: {
      host: "0.0.0.0",
      port: 5173,
      allowedHosts: ["abridgeai.tech", "abridgeai.hcmut.app"],
    },
  };
});
