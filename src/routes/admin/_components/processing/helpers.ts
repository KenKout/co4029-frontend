import { formatDateTime, resolveLocale } from "@/lib/format/date";

// Thin wrapper over the shared formatter; the call site passes the raw i18n
// language, resolveLocale maps it. Same short date+time output.
export function formatDate(
  iso: string | null | undefined,
  language: string,
): string {
  return formatDateTime(iso, resolveLocale(language));
}
