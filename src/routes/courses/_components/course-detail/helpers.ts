import type {
  CoursePublic,
  ModulePublic,
  MyCourseProgressSummary,
  QuizProgressRead,
  InterviewProgressRead,
} from "@/lib/api/types";

/**
 * Shared placeholder-gradient palette. Every student-facing course surface
 * (catalogue card/row, dashboard "My courses", course landing hero) derives
 * the no-thumbnail gradient from the course SLUG via `slugGradient`, so one
 * course paints the same colour on every screen. Never cycle by list index:
 * the colour would change whenever a list is sorted/filtered/paginated and
 * disagree between screens.
 */
export const COURSE_GRADIENTS = [
  "from-blue-500 via-blue-700 to-blue-800",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-pink-500 via-rose-500 to-orange-500",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-red-500",
  "from-blue-500 via-blue-600 to-sky-500",
];

export function slugGradient(slug: string) {
  const hash = slug.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COURSE_GRADIENTS[Math.abs(hash) % COURSE_GRADIENTS.length];
}

/**
 * Exact wall-clock label for the course meta line. No rounding: 7200 min is
 * "120h", 150 min is "2h 30m", 45 min is "45m". Null/absent/zero → null
 * (the caller omits the meta segment entirely).
 */
export function formatEstimatedDuration(
  minutes: number | null | undefined,
): string | null {
  if (minutes == null || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export type ModuleCompletion = "complete" | "partial" | "none";

/** How many visible gradeable units a module has. */
export function unitCount(mod: ModulePublic): number {
  return mod.items.filter((i) => i.target?.id).length;
}

/** How many lesson-type items a module has (legacy display metadata). */
export function lessonCount(mod: ModulePublic): number {
  return mod.items.filter((i) => i.item_type === "lesson").length;
}

function itemIsComplete(
  item: ModulePublic["items"][number],
  progress: MyCourseProgressSummary | undefined,
  quizProgressMap: Map<string, QuizProgressRead> | undefined,
  interviewProgressMap: Map<string, InterviewProgressRead> | undefined,
): boolean {
  const targetId = item.target?.id;
  if (!targetId) return false;
  if (item.item_type === "lesson") {
    return progress?.lessons.some(
      (lesson) =>
        lesson.lesson_id === targetId && lesson.status === "completed",
    ) ?? false;
  }
  if (item.item_type === "quiz") {
    return quizProgressMap?.get(targetId)?.completed === true;
  }
  if (item.item_type === "interview") {
    return interviewProgressMap?.get(targetId)?.completed === true;
  }
  return false;
}

/**
 * Per-module completion using the same gradeable-unit vocabulary as career
 * paths: published lesson, quiz, or interview items visible in the module.
 */
export function moduleCompletion(
  mod: ModulePublic,
  progress: MyCourseProgressSummary | undefined,
  quizProgressMap?: Map<string, QuizProgressRead>,
  interviewProgressMap?: Map<string, InterviewProgressRead>,
): ModuleCompletion {
  const items = mod.items.filter((item) => item.target?.id);
  if (!items.length || !progress) return "none";
  const done = items.filter((item) =>
    itemIsComplete(item, progress, quizProgressMap, interviewProgressMap),
  ).length;
  if (done === items.length) return "complete";
  if (done > 0) return "partial";
  return "none";
}

export function moduleDoneCount(
  mod: ModulePublic,
  progress: MyCourseProgressSummary | undefined,
  quizProgressMap?: Map<string, QuizProgressRead>,
  interviewProgressMap?: Map<string, InterviewProgressRead>,
): number {
  return mod.items
    .filter((item) => item.target?.id)
    .filter((item) =>
      itemIsComplete(item, progress, quizProgressMap, interviewProgressMap),
    ).length;
}

/**
 * The four optional contact fields, trimmed, plus whether any survived.
 *
 * Lifted verbatim out of InstructorCard: a whitespace-only field counts as
 * absent, which is what keeps the contact half (and the whole card) from
 * rendering an empty section. `src/routes/__tests__/course-detail-instructor.test.tsx`
 * pins this predicate.
 */
export function deriveContactLinks(course: CoursePublic) {
  const email = course.contact_email?.trim();
  const phone = course.contact_phone?.trim();
  const website = course.contact_website_url?.trim();
  const social = course.contact_social_url?.trim();
  const hasContact = Boolean(email || phone || website || social);
  return { email, phone, website, social, hasContact };
}

/** Strip the scheme for a cleaner visible label on URL rows. */
export function prettyUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
