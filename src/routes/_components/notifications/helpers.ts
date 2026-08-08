import type { Notification, NotificationCategory } from "@/lib/api/types";

/** Grouping modes for the inbox list. */
export type NotificationGroupBy = "date" | "type";

/** Read-status filter values (undefined = all). */
export type NotificationStatusFilter = "unread" | "read" | undefined;

/** Date buckets for date-grouping (stable order, newest first). */
export type DateBucket = "today" | "yesterday" | "this_week" | "earlier";

/**
 * Translate a toolbar time range into a `created_at` cutoff (ISO string).
 * Mirrors `sinceFromRange` in admin processing: today/yesterday are
 * calendar-day boundaries, the rest are rolling windows, `all` keeps
 * everything. Client-side because the notifications endpoint has no time
 * filter.
 */
export function sinceFromTimeRange(range: string): string {
  const now = new Date();
  switch (range) {
    case "today": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case "yesterday": {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case "week":
      return new Date(now.getTime() - 7 * 86_400_000).toISOString();
    case "month":
      return new Date(now.getTime() - 30 * 86_400_000).toISOString();
    case "6months":
      return new Date(now.getTime() - 180 * 86_400_000).toISOString();
    case "year":
      return new Date(now.getTime() - 365 * 86_400_000).toISOString();
    case "custom":
    default:
      return "1970-01-01T00:00:00.000Z";
  }
}

/** Resolve a custom from/to pair (``YYYY-MM-DD``) into ISO instants for the
 *  client-side filter. The ``to`` day is inclusive (``to + 1 day``). */
export function boundsFromCustomRange(
  range: { from?: string; to?: string } | undefined,
): { since: string; until?: string } {
  if (!range?.from) {
    return { since: "1970-01-01T00:00:00.000Z" };
  }
  const since = new Date(`${range.from}T00:00:00.000Z`).toISOString();
  if (!range.to) return { since };
  const until = new Date(`${range.to}T00:00:00.000Z`);
  until.setUTCDate(until.getUTCDate() + 1);
  return { since, until: until.toISOString() };
}

export interface NotificationFilters {
  search?: string;
  /** Preset name ("week", "month", …) resolved via ``sinceFromTimeRange``.
   *  Ignored when ``since`` (an already-resolved ISO instant) is provided. */
  timeRange?: string;
  /** Pre-resolved lower bound (custom range "from" date). */
  since?: string;
  /** Optional upper bound on ``created_at`` (custom range "to" date). */
  until?: string;
  status?: NotificationStatusFilter;
  category?: NotificationCategory | "all" | undefined;
}

/**
 * Client-side filtering for the inbox: search matches title or body, the
 * time range is a ``created_at`` cutoff (plus optional ``until`` upper
 * bound), status is read/unread, category is an exact match. All filters
 * are ANDed; undefined/empty means "no filter".
 */
export function filterNotifications(
  items: Notification[],
  filters: NotificationFilters,
): Notification[] {
  const q = filters.search?.trim().toLowerCase() ?? "";
  const since =
    filters.since ?? sinceFromTimeRange(filters.timeRange ?? "all");
  const until = filters.until;
  const status = filters.status;
  const category = filters.category;

  return items.filter((n) => {
    if (q) {
      const haystack = `${n.title} ${n.body ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (n.created_at < since) return false;
    if (until && n.created_at > until) return false;
    if (status === "unread" && n.read_at !== null) return false;
    if (status === "read" && n.read_at === null) return false;
    if (category && category !== "all" && n.category !== category) return false;
    return true;
  });
}

/** Stable canonical order of notification categories (drives type grouping). */
export const CATEGORY_ORDER: NotificationCategory[] = [
  "spaced_repetition",
  "lesson_unlock",
  "interview_result",
  "course_announcement",
  "system",
  "material_processing",
  "quiz_generation",
  "interview_generation",
];

/**
 * Bucket a notification into a date group (local calendar days). `now` is
 * injectable for tests.
 */
export function dateBucketFor(
  created_at: string,
  now: Date = new Date(),
): DateBucket {
  const d = new Date(created_at);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  if (d >= startOfToday) return "today";
  if (d >= startOfYesterday) return "yesterday";
  if (d >= startOfWeek) return "this_week";
  return "earlier";
}

export interface NotificationGroup {
  key: string;
  items: Notification[];
}

/**
 * Group a filtered list by date bucket or by category. Preserves the input
 * order (newest first, as the API returns) within each group.
 */
export function groupNotifications(
  items: Notification[],
  by: NotificationGroupBy,
): NotificationGroup[] {
  if (by === "type") {
    const map = new Map<string, Notification[]>();
    for (const n of items) {
      const list = map.get(n.category) ?? [];
      list.push(n);
      map.set(n.category, list);
    }
    // Canonical category order; categories with no items are skipped.
    const groups: NotificationGroup[] = [];
    for (const cat of CATEGORY_ORDER) {
      const list = map.get(cat);
      if (list && list.length > 0) groups.push({ key: cat, items: list });
    }
    // Any category outside the canonical list (future backend additions) still
    // shows, sorted after the known ones.
    for (const [key, list] of map) {
      if (!CATEGORY_ORDER.includes(key as NotificationCategory)) {
        groups.push({ key, items: list });
      }
    }
    return groups;
  }

  // Date grouping — fixed bucket order, newest first.
  const order: DateBucket[] = ["today", "yesterday", "this_week", "earlier"];
  const map = new Map<DateBucket, Notification[]>();
  for (const n of items) {
    const bucket = dateBucketFor(n.created_at);
    const list = map.get(bucket) ?? [];
    list.push(n);
    map.set(bucket, list);
  }
  const groups: NotificationGroup[] = [];
  for (const bucket of order) {
    const list = map.get(bucket);
    if (list && list.length > 0) groups.push({ key: bucket, items: list });
  }
  return groups;
}
