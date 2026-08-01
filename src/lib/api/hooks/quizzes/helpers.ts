/**
 * Internal helpers shared by sibling quiz hook modules. Deliberately NOT
 * re-exported from the `quizzes.ts` barrel — the public surface must not grow.
 */

/** Filename from a Content-Disposition header, or a fallback. */
export function filenameFromDisposition(
  header: string | null,
  fallback: string,
): string {
  if (!header) return fallback;
  const match = /filename="?([^"]+)"?/.exec(header);
  return match ? match[1] : fallback;
}
