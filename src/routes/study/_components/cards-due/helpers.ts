import type { CardDue } from "@/lib/api/types";

/**
 * Group the flat due list into course → lesson counts.
 *
 * Deliberately a COUNT view, not a browsable card list. Two reasons, both
 * pedagogical rather than cosmetic:
 *   1. A per-card list invites cherry-picking — students skip the cards they
 *      dread, which is exactly what breaks spaced repetition. Counts + a single
 *      "Review" action keep the queue order authoritative (most-overdue first,
 *      enforced server-side).
 *   2. We do NOT surface per-card recall strength / EF here. EF is an internal
 *      scheduler parameter; showing "strong" on a card that's due reads as a
 *      bug (you review at the edge of forgetting — that's the point) and
 *      priming a student's expectation before they attempt changes how they
 *      attempt. Anki shows nothing about a card before you try it; we match.
 */
export interface LessonBucket {
  lessonId: string;
  /** URL slug — what review links carry, so the URL is readable. */
  lessonSlug: string;
  lessonTitle: string;
  count: number;
  /** Cards whose due_at is before today (any age). */
  overdue: number;
  /** Subset of `overdue` past the severe threshold (red). */
  severe: number;
}
export interface CourseBucket {
  courseSlug: string;
  courseTitle: string;
  count: number;
  overdue: number;
  severe: number;
  lessons: LessonBucket[];
}

// The review session serves at most this many cards, even when the backlog
// is bigger — the CTA must say the SESSION size, never the backlog size.
export const SESSION_CARD_LIMIT = 20;

// Past-due by at least this many whole days = "overdue by 7+ days" (red).
// Below that but before today = plain overdue (orange); due on/after today
// = normal. The label interpolates DAYS_OR_MORE directly so the wording
// always matches the rule.
export const SEVERE_OVERDUE_DAYS = 7;

/** Local midnight — the "due today" boundary is the student's own day. */
export function startOfLocalDay(now: Date = new Date()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type DueClass = "today" | "overdue" | "severe";

/**
 * Classify one due card against the student's current local day.
 *
 * "Severe" is a subset of "overdue": a card past the local-midnight
 * boundary AND at least SEVERE_OVERDUE_DAYS whole days old (inclusive —
 * the summary labels this subset "overdue by 7+ days", so the boundary
 * must be >= to match the wording).
 */
export function classifyDue(
  dueAtIso: string,
  now: Date = new Date(),
): DueClass {
  const due = Date.parse(dueAtIso);
  if (Number.isNaN(due)) return "today"; // unparseable → treat as due now
  const midnight = startOfLocalDay(now);
  if (due >= midnight) return "today";
  const severeLine = midnight - SEVERE_OVERDUE_DAYS * 86_400_000;
  return due <= severeLine ? "severe" : "overdue";
}

export function groupByCourse(cards: CardDue[]): CourseBucket[] {
  const courses = new Map<
    string,
    { title: string; lessons: Map<string, LessonBucket> }
  >();
  for (const card of cards) {
    const cls = classifyDue(card.due_at);
    let course = courses.get(card.course_slug);
    if (!course) {
      course = { title: card.course_title, lessons: new Map() };
      courses.set(card.course_slug, course);
    }
    const lesson = course.lessons.get(card.lesson_id);
    if (lesson) {
      lesson.count += 1;
      lesson.overdue += cls === "overdue" || cls === "severe" ? 1 : 0;
      lesson.severe += cls === "severe" ? 1 : 0;
    } else {
      course.lessons.set(card.lesson_id, {
        lessonId: card.lesson_id,
        lessonSlug: card.lesson_slug,
        lessonTitle: card.lesson_title,
        count: 1,
        overdue: cls === "overdue" || cls === "severe" ? 1 : 0,
        severe: cls === "severe" ? 1 : 0,
      });
    }
  }
  const buckets: CourseBucket[] = [...courses.entries()].map(([slug, c]) => {
    const lessons = [...c.lessons.values()].sort((a, b) => b.count - a.count);
    const overdue = lessons.reduce((n, l) => n + l.overdue, 0);
    const severe = lessons.reduce((n, l) => n + l.severe, 0);
    return {
      courseSlug: slug,
      courseTitle: c.title,
      count: lessons.reduce((n, l) => n + l.count, 0),
      overdue,
      severe,
      lessons,
    };
  });
  return buckets.sort((a, b) => b.count - a.count);
}

/** Aggregated composition of the whole backlog (summary line inputs). */
export function summarizeBacklog(
  cards: CardDue[],
): { total: number; overdue: number; severe: number; dueToday: number } {
  let overdue = 0;
  let severe = 0;
  for (const card of cards) {
    const cls = classifyDue(card.due_at);
    if (cls === "overdue" || cls === "severe") overdue += 1;
    if (cls === "severe") severe += 1;
  }
  return { total: cards.length, overdue, severe, dueToday: cards.length - overdue };
}

/**
 * How many cards the NEXT review session actually takes. The session caps at
 * SESSION_CARD_LIMIT; everything past that stays queued for a later session.
 */
export function sessionSize(total: number): number {
  return Math.min(total, SESSION_CARD_LIMIT);
}

// Cap on how many extra pages we auto-drain to make the counts accurate. At
// limit=100/page this covers a 1,000-card backlog before we stop and show "+".
export const MAX_AUTODRAIN_PAGES = 10;