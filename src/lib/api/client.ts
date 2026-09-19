import { authenticatedFetch, publicFetch, setMfaRequired } from "../auth";

/**
 * The transport an `apiJson` call rides on. Every helper here defaults to
 * the authenticated one; only the deliberately-open endpoints opt out.
 */
type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

function cleanApiMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Some endpoints prefix the readable sentence with an internal reason code,
  // e.g. `course_slug_taken: a course ...`. Keep the sentence, not the code.
  const withoutCode = trimmed.replace(/^[a-z][a-z0-9_]*:\s*/i, "").trim();
  return withoutCode || null;
}

/** Extract a user-facing sentence from the response shapes used by FastAPI. */
export function getApiBodyMessage(body: string): string | null {
  if (!body.trim()) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    // Preserve useful plain-text errors, but never surface an HTML proxy page.
    return /^\s*</.test(body) ? null : cleanApiMessage(body);
  }
  if (!payload || typeof payload !== "object") return null;

  const record = payload as { detail?: unknown; message?: unknown };
  const detail = record.detail;
  if (typeof detail === "string") return cleanApiMessage(detail);
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string") return cleanApiMessage(message);
  }
  // FastAPI/Pydantic validation errors use `detail: [{loc, msg, type}]`.
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const message = (item as { msg?: unknown }).msg;
        return typeof message === "string" ? cleanApiMessage(message) : null;
      })
      .filter((message): message is string => Boolean(message));
    if (messages.length) return Array.from(new Set(messages)).join("; ");
  }
  if (typeof record.message === "string") {
    return cleanApiMessage(record.message);
  }
  return null;
}

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string, statusText: string) {
    super(
      getApiBodyMessage(body) || statusText || `Request failed (${status})`,
    );
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /**
   * Best-effort parse of `body` as JSON. Returns `null` on failure.
   * Backends that follow the FastAPI convention return
   * `{detail: {error: "...", ...}}` for typed errors.
   */
  get parsedBody(): unknown {
    if (!this.body) return null;
    try {
      return JSON.parse(this.body);
    } catch {
      return null;
    }
  }

  /**
   * Domain error code surfaced by the backend, if any.
   * Pulled from `body.detail.error` when the body is JSON of the form
   * `{ detail: { error: string, ... } }`. Returns `null` otherwise.
   */
  get code(): string | null {
    const parsed = this.parsedBody;
    if (!parsed || typeof parsed !== "object") return null;
    const detail = (parsed as { detail?: unknown }).detail;
    if (!detail || typeof detail !== "object") return null;
    const error = (detail as { error?: unknown }).error;
    return typeof error === "string" ? error : null;
  }
}

async function readError(res: Response) {
  const body = await res.text().catch(() => "");
  const err = new ApiError(res.status, body, res.statusText);
  // Backend now returns 403 {detail:{error:"mfa_required"}} on every
  // protected endpoint when the session has not completed MFA. Mark
  // the SPA auth state so the MfaGate redirects to /login/mfa. The
  // event also wakes any other tab that's mid-render.
  if (res.status === 403 && err.code === "mfa_required") {
    setMfaRequired(true);
  }
  return err;
}

async function apiJson<T>(
  path: string,
  init?: RequestInit,
  fetcher: Fetcher = authenticatedFetch,
): Promise<T> {
  const res = await fetcher(path, init);

  if (!res.ok) {
    throw await readError(res);
  }

  // A 204 (and a 205) has NO body, so `res.json()` rejects with
  // "Unexpected end of JSON input" — turning a successful call into a thrown
  // error at the call site. That is not hypothetical: POST /realtime-agent
  // returns 204, its caller treated the rejection as "the agent could not be
  // dispatched", and tore down a room the agent had in fact just joined
  // (session 5a3995ec, dispatch 204 at 17:14:22, client re-minted at 17:14:47
  // and the candidate got no voice).
  //
  // Callers of a no-content endpoint type it as `Promise<void>`, so resolving
  // with undefined matches what they already expect.
  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function apiFetch<T>(path: string): Promise<T> {
  return apiJson<T>(path);
}

/**
 * GET an endpoint that does not require a session.
 *
 * Same error handling as {@link apiFetch} — only the transport differs, so a
 * public endpoint still raises {@link ApiError} with a parsed code rather
 * than a bare network rejection.
 *
 * Reserved for endpoints the backend serves unauthenticated ON PURPOSE. It is
 * not a way around a 401: pointed at a protected endpoint it simply fails
 * without the Authorization header, and it loses the refresh-and-retry that
 * {@link apiFetch} does for an expired token.
 */
export function apiFetchPublic<T>(path: string): Promise<T> {
  return apiJson<T>(path, undefined, publicFetch);
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  return apiJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiJson<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiJson<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE. Defaults to discarding the response, which is what most callers
 * want; pass a type argument when the endpoint answers with a body worth
 * keeping (the settings clear returns the audit row it just wrote, so the UI
 * can offer to undo it). A 204 still resolves to `undefined` either way.
 */
export async function apiDelete<T = void>(path: string): Promise<T> {
  const res = await authenticatedFetch(path, { method: "DELETE" });

  if (!res.ok && res.status !== 204) {
    throw await readError(res);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * GET that returns the raw {@link Response} so callers can read the body as a
 * Blob AND inspect headers (e.g. Content-Disposition for a download filename).
 * Throws {@link ApiError} on non-2xx. Used by the report/export download helper.
 */
export async function apiGetResponse(path: string): Promise<Response> {
  const res = await authenticatedFetch(path, { method: "GET" });
  if (!res.ok) {
    throw await readError(res);
  }
  return res;
}

/**
 * POST that returns a binary Blob (e.g. synthesized audio) instead of JSON.
 * Throws {@link ApiError} on non-2xx so callers can distinguish a real
 * failure (503 → fall back to browser TTS) from a successful audio response.
 */
export async function apiPostBlob(path: string, body?: unknown): Promise<Blob> {
  const res = await authenticatedFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw await readError(res);
  }

  return res.blob();
}
