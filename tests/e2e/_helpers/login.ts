import type { Page } from "@playwright/test";
import { Client } from "pg";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { createHmac } from "node:crypto";
import { databaseUrl, describeDatabase, jwtSecret } from "./env";

export type SeedRole = "admin" | "teacher" | "student";

export const SEED_USER_IDS: Readonly<Record<SeedRole, string>> = {
  admin: "00000000-0000-0000-0000-00000000aaaa",
  teacher: "00000000-0000-0000-0000-00000000bbbb",
  student: "00000000-0000-0000-0000-00000000cccc",
};

const SEED_EMAILS: Readonly<Record<SeedRole, string>> = {
  admin: "e2e-admin@example.com",
  teacher: "e2e-teacher@example.com",
  student: "e2e-student@example.com",
};

const SEED_DISPLAY_NAMES: Readonly<Record<SeedRole, string>> = {
  admin: "E2E Admin",
  teacher: "E2E Teacher",
  student: "E2E Student",
};

const ACCESS_TTL_SECONDS = 900;
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const STORAGE_KEYS = {
  accessToken: "abridgeai.access_token",
  refreshToken: "abridgeai.refresh_token",
  tokenType: "abridgeai.token_type",
  expiresAt: "abridgeai.access_token_expires_at",
  requiresMfa: "abridgeai.requires_mfa",
  user: "abridgeai.user",
} as const;

function urlBase64(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function hashSecret(value: string): string {
  const digest = createHmac("sha256", jwtSecret())
    .update(value, "utf8")
    .digest("hex");
  return `sha256:${digest}`;
}

function generateRefreshToken(): string {
  return urlBase64(Buffer.from(randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, ""), "hex"));
}

async function ensureAuthSession(userId: string): Promise<{
  sessionId: string;
  refreshToken: string;
  expiresAtMs: number;
}> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    await client.query("SELECT set_config('app.actor_id', $1, true);", [userId]);

    const sessionId = randomUUID();
    const refreshToken = generateRefreshToken();
    const refreshHash = hashSecret(refreshToken);
    const expiresAtMs = Date.now() + SESSION_TTL_SECONDS * 1000;
    const expiresAtIso = new Date(expiresAtMs).toISOString();

    await client.query(
      `INSERT INTO auth_sessions (id, user_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, userId, refreshHash, expiresAtIso],
    );

    return { sessionId, refreshToken, expiresAtMs };
  } finally {
    await client.end();
  }
}

function mintAccessToken(userId: string, sessionId: string): {
  token: string;
  expiresAtMs: number;
} {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + ACCESS_TTL_SECONDS;
  const token = jwt.sign(
    { sub: userId, sid: sessionId, iat: nowSec, exp: expSec },
    jwtSecret(),
    { algorithm: "HS256" },
  );
  return { token, expiresAtMs: expSec * 1000 };
}

export async function loginAs(page: Page, role: SeedRole): Promise<void> {
  const userId = SEED_USER_IDS[role];
  const session = await ensureAuthSession(userId);
  const access = mintAccessToken(userId, session.sessionId);

  const userPayload = {
    id: userId,
    primary_email: SEED_EMAILS[role],
    status: "active",
    last_login_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile: {
      user_id: userId,
      given_name: "E2E",
      family_name: role === "admin" ? "Admin" : role === "teacher" ? "Teacher" : "Student",
      display_name: SEED_DISPLAY_NAMES[role],
      avatar_object_id: null,
      bio: null,
    },
  };

  await page.goto("/");

  await page.evaluate(
    ({ keys, values }) => {
      window.localStorage.setItem(keys.accessToken, values.accessToken);
      window.localStorage.setItem(keys.refreshToken, values.refreshToken);
      window.localStorage.setItem(keys.tokenType, "bearer");
      window.localStorage.setItem(keys.expiresAt, String(values.expiresAtMs));
      window.localStorage.setItem(keys.requiresMfa, "false");
      window.localStorage.setItem(keys.user, values.userJson);
    },
    {
      keys: STORAGE_KEYS,
      values: {
        accessToken: access.token,
        refreshToken: session.refreshToken,
        expiresAtMs: access.expiresAtMs,
        userJson: JSON.stringify(userPayload),
      },
    },
  );

  await assertTokenAccepted(page, access.token, role);
}

/**
 * Prove the minted token is one the backend under test actually accepts.
 *
 * Without this the suite cannot tell a rejected token from a missing feature:
 * the app simply redirects to the login screen, and each test fails on its own
 * assertion about a heading or a table that was never going to be rendered.
 * One request here converts a whole red suite into a single accurate message.
 */
async function assertTokenAccepted(
  page: Page,
  token: string,
  role: SeedRole,
): Promise<void> {
  const response = await page.request.get("/api/v1/users/me", {
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  });

  if (response.ok()) return;

  throw new Error(
    [
      `E2E login failed for role "${role}": the backend rejected the minted token ` +
        `(HTTP ${response.status()}).`,
      "",
      "The suite signs its own access token and inserts the auth_sessions row itself,",
      "so it must share the backend's JWT secret and database. It used:",
      `  database   ${describeDatabase()}`,
      `  jwt secret ${process.env.JWT_SECRET_KEY ? "$JWT_SECRET_KEY" : "backend .env or built-in default"}`,
      "",
      "Set these to match the backend under test and re-run:",
      "  export E2E_DATABASE_URL=postgresql://<user>:<pass>@<host>:<port>/<database>",
      "  export JWT_SECRET_KEY=<the backend's JWT_SECRET_KEY>",
    ].join("\n"),
  );
}
