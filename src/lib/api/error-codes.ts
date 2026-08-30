import { ApiError } from "./client";

export type ApiErrorCode =
  | "card_cooldown_active"
  | "concurrent_reprocess"
  | "upload_not_found"
  | "upload_invalid"
  | "permission_denied"
  | "not_found"
  | "conflict";

export function getApiErrorCode(err: unknown): ApiErrorCode | null {
  if (!(err instanceof ApiError)) return null;
  const code = err.code;
  return code === null ? null : (code as ApiErrorCode);
}

export function isApiErrorCode(err: unknown, code: ApiErrorCode): boolean {
  return getApiErrorCode(err) === code;
}

/**
 * The sentence to put in a toast for a failed request.
 *
 * Prefers `detail.message` — the backend's human explanation — over
 * `ApiError.message`, which is the raw `API 409: {"detail":{...}}` dump, and
 * over machine codes like `concurrent_program_limit_reached:<uuid>:1` that
 * managers were being shown verbatim. Falls back to `fallback` when the
 * response carries no readable text.
 *
 * Duck-typed on `body` rather than `err instanceof ApiError`: several test
 * suites mock `@/lib/api/client` without exporting `ApiError`, and
 * `instanceof undefined` throws.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { body?: unknown } | null)?.body;
  if (typeof body === "string") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return fallback;
    }
    const detail = (parsed as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    const message = (detail as { message?: unknown } | null)?.message;
    if (typeof message === "string" && message.trim()) return message;
    return fallback;
  }
  const message = (err as { message?: unknown } | null)?.message;
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}
