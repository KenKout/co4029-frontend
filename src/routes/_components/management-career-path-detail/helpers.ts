import type { SelectableEntity } from "@/components/ui/entity-multi-select-dialog";
import type { AdminUserSearchRow } from "@/lib/api/hooks/admin-organizations";
import type { CareerPathCourseAuthoring, Course } from "@/lib/api/types";

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
 * Map the catalogue to the dialog shape and filter client-side by title/slug
 * (the /courses endpoint has no q= param).
 */
export function toCourseCandidates(
  items: Course[] | undefined,
  query: string,
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
