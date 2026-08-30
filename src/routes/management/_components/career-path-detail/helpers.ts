import type { SelectableEntity } from "@/components/ui/entity-multi-select-dialog";
import type { AdminUserSearchRow } from "@/lib/api/hooks/admin-organizations";
import type { CareerPathCourseCandidate } from "@/lib/api/hooks/career-paths";
import type { CareerPathCourseAuthoring } from "@/lib/api/types";

/**
 * Pure data shaping for the career-path detail screen. Everything here is a
 * plain function of its arguments so the tab hooks stay thin and the memo
 * dependency arrays are the only thing left to read in them.
 */

/** Attached courses in backend-declared order. */
export function sortCoursesByPosition(
  rows: CareerPathCourseAuthoring[] | undefined,
): CareerPathCourseAuthoring[] {
  return [...(rows ?? [])].sort((a, b) => a.position - b.position);
}

/** True when the locally reordered list no longer matches the fetched order. */
export function courseOrderChanged(
  order: CareerPathCourseAuthoring[],
  baseRows: CareerPathCourseAuthoring[],
): boolean {
  return order.some((row, i) => row.course_id !== baseRows[i]?.course_id);
}

/**
 * Map the org course catalogue to the dialog shape and filter client-side by
 * title/slug. `status` rides along so the picker rows can show a badge.
 *
 * `requirePublished` mirrors the backend guard in `add_course_to_path`: on a
 * PUBLISHED path only published courses may be attached (a draft path may hold
 * draft courses while the skeleton is built). When it is set, draft/archived
 * courses render disabled with a reason rather than being pickable and then
 * 409-ing — and rather than being hidden, which only moves the confusion to
 * "where did my course go?".
 */
export function toCourseCandidates(
  items: CareerPathCourseCandidate[] | undefined,
  query: string,
  requirePublished = false,
): SelectableEntity[] {
  const q = query.trim().toLowerCase();
  return (items ?? [])
    .filter(
      (c) =>
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    )
    .map((c) => ({
      id: c.id,
      primaryLabel: c.title,
      secondaryLabel: c.slug,
      status: c.status,
      selectable: requirePublished ? c.status === "published" : true,
      notSelectableReason:
        requirePublished && c.status !== "published"
          ? "course_not_published"
          : null,
    }));
}

/** Map an /admin/users search page to the dialog shape. */
export function toStudentCandidates(
  users: AdminUserSearchRow[] | undefined,
): SelectableEntity[] {
  return (users ?? []).map((u) => ({
    id: u.user_id,
    primaryLabel: u.display_name?.trim() || u.primary_email,
    secondaryLabel: u.primary_email,
  }));
}

/** Copy of `rows` with the entries at `idx` and `target` swapped. */
export function swapRows<T>(rows: T[], idx: number, target: number): T[] {
  const next = [...rows];
  [next[idx], next[target]] = [next[target], next[idx]];
  return next;
}
