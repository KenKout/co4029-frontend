import { ApiError, getApiBodyMessage } from "./client";

export type ApiErrorCode =
  | "card_cooldown_active"
  | "concurrent_reprocess"
  | "upload_not_found"
  | "upload_invalid"
  | "permission_denied"
  | "not_found"
  | "conflict"
  | "path_already_active";

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
 * Reads the same normalized backend sentence used by `ApiError.message` and
 * lets a call site provide a contextual fallback when the response carries no
 * readable text. Machine codes and raw JSON never become display text.
 *
 * Duck-typed on `body` rather than `err instanceof ApiError`: several test
 * suites mock `@/lib/api/client` without exporting `ApiError`, and
 * `instanceof undefined` throws.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { body?: unknown } | null)?.body;
  if (typeof body === "string") {
    return getApiBodyMessage(body) ?? fallback;
  }
  const message = (err as { message?: unknown } | null)?.message;
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}
