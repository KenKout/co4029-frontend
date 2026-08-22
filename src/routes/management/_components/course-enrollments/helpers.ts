import type { BulkEnrollFailure } from "@/lib/api/types";
import { UUID_RE } from "./constants";

/**
 * Pure data shaping for the enrollment screen. Everything here is a plain
 * function of its arguments, so the tab hooks stay thin and their memo
 * dependency arrays are the only thing left to read in them.
 */

/** Timestamp rendering used by the roster and invitation-code tables. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ISO instant -> the `yyyy-mm-dd` an `<input type="date">` expects. */
export function formatDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** `yyyy-mm-dd` from a date input -> end-of-day ISO instant, or null. */
export function dateInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Split the pasted textarea into user ids, emails and unusable lines. */
export function parseBulkIdentifiers(text: string): {
  userIds: string[];
  emails: string[];
  invalid: string[];
} {
  const userIds: string[] = [];
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (UUID_RE.test(line)) {
      userIds.push(line);
    } else if (line.includes("@")) {
      emails.push(line);
    } else {
      invalid.push(line);
    }
  }
  return { userIds, emails, invalid };
}

/** Bucket bulk-enroll failures by reason, preserving first-seen reason order. */
export function groupFailuresByReason(
  failures: BulkEnrollFailure[],
): [string, BulkEnrollFailure[]][] {
  const map = new Map<string, BulkEnrollFailure[]>();
  for (const f of failures) {
    const list = map.get(f.reason) ?? [];
    list.push(f);
    map.set(f.reason, list);
  }
  return Array.from(map.entries());
}
