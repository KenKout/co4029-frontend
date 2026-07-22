import type { Notification } from "@/lib/api/types";

export function notificationDeepLink(notification: Notification): string | null {
  // Option B: prefer the precomputed action_url built by the backend, which
  // holds the full routing context (course slug + nested ids) at creation
  // time. A single entity_id can't express a nested route, so this is the
  // reliable target. The entity_type map below is a best-effort fallback for
  // legacy rows created before action_url existed.
  if (notification.action_url) return notification.action_url;

  if (!notification.entity_type || !notification.entity_id) return null;
  switch (notification.entity_type) {
    // NOTE: fallbacks that need a course slug (quiz, lesson) can't be built
    // from entity_id alone — those rows rely on action_url. Only routes that
    // are addressable by a single id (or are static) are mapped here.
    case "enrollment":
      return `/progress`;
    case "career_path":
      return `/progress`;
    default:
      return null;
  }
}

/**
 * A segment of a parsed Markdown notification body.
 * - "text": plain text run.
 * - "link": Markdown link `[label](url)`.
 */
export type MarkdownSegment =
  | { type: "text"; text: string }
  | { type: "link"; label: string; url: string };

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * Minimal `[label](url)` parser for SR remediation notification bodies
 * (phase-7-5-sr.md §5). A full Markdown dependency is intentionally avoided.
 */
export function parseNotificationBody(body: string | null | undefined): MarkdownSegment[] {
  if (!body) return [];
  const segments: MarkdownSegment[] = [];
  let cursor = 0;
  MARKDOWN_LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null = MARKDOWN_LINK_RE.exec(body);
  while (match) {
    if (match.index > cursor) {
      segments.push({ type: "text", text: body.slice(cursor, match.index) });
    }
    segments.push({ type: "link", label: match[1], url: match[2] });
    cursor = match.index + match[0].length;
    match = MARKDOWN_LINK_RE.exec(body);
  }
  if (cursor < body.length) {
    segments.push({ type: "text", text: body.slice(cursor) });
  }
  return segments;
}

export interface RemediationDeepLink {
  pathname: string;
  seconds: number | null;
  page: number | null;
  anchor: string | null;
}

/**
 * Parse an SR remediation link (phase-7-5-sr.md §5):
 *   `.../resources/{mid}?t={s}` | `?p={page}` | `#{anchor}`.
 * Uses a placeholder base because the spec mandates relative paths.
 */
export function parseRemediationDeepLink(url: string): RemediationDeepLink | null {
  try {
    const u = new URL(url, "http://placeholder.local");
    const t = u.searchParams.get("t");
    const p = u.searchParams.get("p");
    const seconds = t !== null ? Number(t) : null;
    const page = p !== null ? Number(p) : null;
    const anchor = u.hash ? u.hash.slice(1) : null;
    return {
      pathname: u.pathname + u.search,
      seconds: seconds !== null && Number.isFinite(seconds) ? seconds : null,
      page: page !== null && Number.isFinite(page) ? page : null,
      anchor: anchor && anchor.length > 0 ? anchor : null,
    };
  } catch {
    return null;
  }
}
