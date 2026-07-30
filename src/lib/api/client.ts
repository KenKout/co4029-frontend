import { authenticatedFetch, setMfaRequired } from "../auth";

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string, statusText: string) {
    super(`API ${status}: ${body || statusText}`);
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

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedFetch(path, init);

  if (!res.ok) {
    throw await readError(res);
  }

  return res.json() as Promise<T>;
}

export function apiFetch<T>(path: string): Promise<T> {
  return apiJson<T>(path);
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

export async function apiDelete(path: string): Promise<void> {
  const res = await authenticatedFetch(path, { method: "DELETE" });

  if (!res.ok && res.status !== 204) {
    throw await readError(res);
  }
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
