import { formatDateTime, resolveLocale } from "@/lib/format/date";

// Thin wrapper over the shared date/time formatter so the existing call sites
// (which pass the raw i18n language) keep working; resolveLocale maps it to a
// BCP-47 locale. Same short-date + short-time output as before.
export function formatDate(
  iso: string | null | undefined,
  language: string,
): string {
  return formatDateTime(iso, resolveLocale(language));
}

/**
 * Toast copy for a failed mutation: the server message when the rejection is a
 * real `Error`, otherwise the supplied i18n fallback. Hoisted out of the four
 * tab `catch` blocks that all spelled this ternary out by hand.
 */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
