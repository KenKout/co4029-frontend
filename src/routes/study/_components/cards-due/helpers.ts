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
  lessonTitle: string;
  count: number;
}
export interface CourseBucket {
  courseSlug: string;
  courseTitle: string;
  count: number;
  lessons: LessonBucket[];
}

export function groupByCourse(cards: CardDue[]): CourseBucket[] {
  const courses = new Map<
    string,
    { title: string; lessons: Map<string, LessonBucket> }
  >();
  for (const card of cards) {
    let course = courses.get(card.course_slug);
    if (!course) {
      course = { title: card.course_title, lessons: new Map() };
      courses.set(card.course_slug, course);
    }
    const lesson = course.lessons.get(card.lesson_id);
    if (lesson) {
      lesson.count += 1;
    } else {
      course.lessons.set(card.lesson_id, {
        lessonId: card.lesson_id,
        lessonTitle: card.lesson_title,
        count: 1,
      });
    }
  }
  return [...courses.entries()]
    .map(([slug, c]) => {
      const lessons = [...c.lessons.values()].sort((a, b) => b.count - a.count);
      return {
        courseSlug: slug,
        courseTitle: c.title,
        count: lessons.reduce((n, l) => n + l.count, 0),
        lessons,
      };
    })
    .sort((a, b) => b.count - a.count);
}

// Cap on how many extra pages we auto-drain to make the counts accurate. At
// limit=100/page this covers a 1,000-card backlog before we stop and show "+".
export const MAX_AUTODRAIN_PAGES = 10;
