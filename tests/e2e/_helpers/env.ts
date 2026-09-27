/**
 * Resolves the two settings the E2E suite shares with the running backend.
 *
 * The browser never logs in through the UI here: `login.ts` mints its own
 * access token and writes an `auth_sessions` row directly. That only works if
 * the suite signs with the *backend's* JWT secret and writes into the
 * *backend's* database. When either differs, nothing errors — the token is
 * simply rejected, every protected route redirects to the login screen, and
 * the failure surfaces far downstream as a page that does not contain the
 * heading a test was looking for. One misconfigured variable reads as dozens
 * of unrelated product defects.
 *
 * So the values are resolved from the backend's own `.env` rather than left to
 * a default that is correct only on a developer laptop. Precedence is
 * explicit environment first (CI sets these directly), then the backend's
 * `.env`, then the local-compose defaults.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * `<repo>/frontend/tests/e2e/_helpers` → `<repo>/backend/.env`. Four levels up
 * lands beside `frontend`, which holds whether the checkout is laid out as
 * `src/{backend,frontend}` or `{backend,frontend}`.
 */
const BACKEND_ENV_PATH = resolve(HERE, "..", "..", "..", "..", "backend", ".env");

const DEFAULT_DATABASE_URL =
  "postgresql://abridgeai:abridgeai@localhost:5433/abridgeai";
const DEFAULT_JWT_SECRET = "dev-only-secret-replace-in-production-32+";

/** SQLAlchemy driver prefixes that `pg` does not understand. */
function toNodePostgresUrl(url: string): string {
  return url.replace(/^postgresql\+\w+:\/\//, "postgresql://");
}

function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return out;
  }
  for (const line of raw.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

let cached: { databaseUrl: string; jwtSecret: string } | null = null;

function resolveConfig(): { databaseUrl: string; jwtSecret: string } {
  if (cached) return cached;

  const backendEnv = existsSync(BACKEND_ENV_PATH)
    ? parseEnvFile(BACKEND_ENV_PATH)
    : null;

  const databaseUrl = toNodePostgresUrl(
    process.env.E2E_DATABASE_URL ??
      process.env.DATABASE_URL ??
      backendEnv?.DATABASE_URL ??
      DEFAULT_DATABASE_URL,
  );

  const jwtSecret =
    process.env.JWT_SECRET_KEY ??
    backendEnv?.JWT_SECRET_KEY ??
    DEFAULT_JWT_SECRET;

  if (!backendEnv && !process.env.JWT_SECRET_KEY) {
    // Not fatal: the defaults are right on a local compose stack. Loud,
    // because on any other host they produce a suite that fails everywhere
    // for a reason no individual failure explains.
    console.warn(
      `[e2e] No backend .env at ${BACKEND_ENV_PATH} and no JWT_SECRET_KEY exported.\n` +
        `[e2e] Falling back to local-compose defaults. If the backend under test\n` +
        `[e2e] uses a different secret or database, every authenticated test will\n` +
        `[e2e] land on the login screen.`,
    );
  }

  cached = { databaseUrl, jwtSecret };
  return cached;
}

export function databaseUrl(): string {
  return resolveConfig().databaseUrl;
}

export function jwtSecret(): string {
  return resolveConfig().jwtSecret;
}

/** Host and database only — safe to print, never includes the password. */
export function describeDatabase(): string {
  try {
    const parsed = new URL(databaseUrl());
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return "<unparseable database url>";
  }
}
