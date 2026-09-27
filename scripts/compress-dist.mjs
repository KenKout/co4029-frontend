#!/usr/bin/env node
// compress-dist.mjs — emit .br (brotli q11) and .gz (gzip level 9) siblings
// for every compressible file in dist/. Run after `vite build`; the preview
// server's precompressedServePlugin serves them with the right
// Content-Encoding. vite build empties dist/ first, so stale variants from a
// previous build cannot survive.
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { gzip, brotliCompress, constants as zlibConstants } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

const DIST_DIR = new URL("../dist", import.meta.url).pathname;

const COMPRESSIBLE = new Set([
  ".js",
  ".mjs",
  ".css",
  ".html",
  ".json",
  ".svg",
  ".xml",
  ".txt",
  ".map",
]);

const MIN_BYTES = 1024;
const CONCURRENCY = 16;

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = join(dir, entry.name);
      return entry.isDirectory() ? listFiles(full) : Promise.resolve([full]);
    }),
  );
  return files.flat();
}

async function compressFile(file) {
  if (!COMPRESSIBLE.has(extname(file))) return null;
  const content = await readFile(file);
  if (content.length < MIN_BYTES) return null;

  const [br, gz] = await Promise.all([
    brotliAsync(content, {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
      },
    }),
    gzipAsync(content, { level: 9 }),
  ]);

  await Promise.all([
    writeFile(`${file}.br`, br),
    writeFile(`${file}.gz`, gz),
  ]);
  return { raw: content.length, br: br.length };
}

const files = await listFiles(DIST_DIR);
const results = [];
let cursor = 0;
async function worker() {
  while (cursor < files.length) {
    const file = files[cursor++];
    const out = await compressFile(file);
    if (out) results.push(out);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const rawBytes = results.reduce((sum, r) => sum + r.raw, 0);
const brBytes = results.reduce((sum, r) => sum + r.br, 0);
const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
console.log(
  `compress-dist: ${results.length} files, ${kb(rawBytes)} -> ${kb(brBytes)} brotli`,
);
