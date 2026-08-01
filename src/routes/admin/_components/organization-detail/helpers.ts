import { formatDateTime, resolveLocale } from "@/lib/format/date";
import { UUID_RE } from "./constants";

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

/** Result of splitting the bulk-add textarea into POSTable ids and junk. */
export interface ParsedBulkUserIds {
  userIds: string[];
  invalid: string[];
}

/**
 * Split the bulk-add textarea into the user ids worth POSTing and the lines
 * that are not UUIDs (surfaced as a "will be skipped" count). Blank lines are
 * dropped silently.
 */
export function parseBulkUserIds(text: string): ParsedBulkUserIds {
  const userIds: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (UUID_RE.test(line)) userIds.push(line);
    else invalid.push(line);
  }
  return { userIds, invalid };
}
