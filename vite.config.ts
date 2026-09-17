import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const searchFaviconPng =
  "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";

function createIcoWithPng(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size, 6);
  header.writeUInt8(size, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  return Buffer.concat([header, png]);
}

const sitemapPlugin = (): Plugin => ({
  name: "abridgeai-sitemap",
  generateBundle() {
    const logoTilePng = Buffer.from(searchFaviconPng, "base64");
    this.emitFile({
      type: "asset",
      fileName: "sitemap.xml",
      source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://abridgeai.tech/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
    });
    this.emitFile({
      type: "asset",
      fileName: "brand/logo-tile.png",
      source: logoTilePng,
    });
    this.emitFile({
      type: "asset",
      fileName: "favicon.ico",
      source: createIcoWithPng(logoTilePng, 112),
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_PROXY_TARGET ?? "http://localhost:8000";
  const enableProxy = env.VITE_DEV_PROXY === "1" || mode === "test";
  const hmrHost = env.VITE_DEV_HMR_HOST;

  return {
    plugins: [react(), tailwindcss(), sitemapPlugin()],
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
