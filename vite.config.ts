import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// 112x112 tile. Kept at 112 because Google's Organization logo structured
// data requires an image of at least 112x112; it is also the og:image and
// twitter:image.
const logoTileBase64 =
  "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";

// 96x96 favicon, rasterised from public/brand/favicon.svg (transparent
// background). Google only renders search-result favicons whose edge is a
// multiple of 48px, so the 112px tile above is silently rejected for that
// slot. Keep the alpha channel: the old palette PNG flattened it to white.
const faviconBase64 =
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
    const logoTilePng = Buffer.from(logoTileBase64, "base64");
    const faviconPng = Buffer.from(faviconBase64, "base64");
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
      fileName: "brand/favicon-96.png",
      source: faviconPng,
    });
    this.emitFile({
      type: "asset",
      fileName: "favicon.ico",
      source: createIcoWithPng(faviconPng, 96),
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
