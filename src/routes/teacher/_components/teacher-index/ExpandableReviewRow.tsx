import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useReviewQueueItems,
  type ReviewQueueItem,
  type ReviewQueueKind,
} from "@/lib/api/hooks/teacher-courses";

/**
 * A review-queue row that expands into the individual places the pending work
 * lives, instead of dumping the teacher on `/teacher/courses` to hunt for it.
 *
 * Each child row reads "Course — Module — Target" and deep-links to the page
 * where the work is actually done:
 *
 *   quiz-cards          → the quiz page (approve/edit cards)
 *   interview-questions → the interview config page
 *   materials           → the LESSON page (quiz generation is keyed on the
 *                         lesson, and no quiz exists yet to link to)
 *   missing-texp        → the quiz page (bulk-set expected response times)
 *
 * The list is fetched lazily on first expand, so a dashboard load costs
 * nothing for categories nobody opens.
 */
const TONE = {
  amber: { icon: "text-amber-600", chip: "bg-amber-100 text-amber-800" },
  violet: { icon: "text-violet-600", chip: "bg-violet-100 text-violet-800" },
  sky: { icon: "text-sky-600", chip: "bg-sky-100 text-sky-800" },
} as const;

const ITEM_LINK_CLASS =
  "flex items-center justify-between gap-3 py-2.5 pl-12 pr-5 transition-colors hover:bg-m3-surface-container-low";

/**
 * Each kind renders its own `<Link>` with a LITERAL route path.
 *
 * Returning `{ to, params }` from a shared helper collapses the three shapes
 * into a union, which defeats TanStack's route typing and forces an `as any`
 * cast. The router IS registered (`declare module … Register` in router.tsx),
 * so written this way a typo or a renamed route is a compile error rather
 * than a dead link discovered by a user.
 */
function ReviewItemLink({
  kind,
  item,
  children,
}: {
  kind: ReviewQueueKind;
  item: ReviewQueueItem;
  children: React.ReactNode;
}) {
  switch (kind) {
    case "quiz-cards":
      return (
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId: item.course_id, quizId: item.target_id }}
          className={ITEM_LINK_CLASS}
        >
          {children}
        </Link>
      );
    case "interview-questions":
      return (
        <Link
          to="/teacher/courses/$courseId/interview-configs/$configId"
          params={{ courseId: item.course_id, configId: item.target_id }}
          className={ITEM_LINK_CLASS}
        >
          {children}
        </Link>
      );
    case "materials":
      return (
        <Link
          to="/teacher/courses/$courseId/lessons/$lessonId"
          params={{ courseId: item.course_id, lessonId: item.target_id }}
          className={ITEM_LINK_CLASS}
        >
          {children}
        </Link>
      );
    case "missing-texp":
      // Same destination as quiz-cards: the quiz page, where the teacher
      // bulk-sets expected response times on the questions tab.
      return (
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId: item.course_id, quizId: item.target_id }}
          className={ITEM_LINK_CLASS}
        >
          {children}
        </Link>
      );
  }
}

export function ExpandableReviewRow({
  label,
  count,
  hint,
  icon: Icon,
  kind,
  tone = "amber",
}: {
  label: string;
  count: number;
  hint?: string;
  icon?: LucideIcon;
  kind: ReviewQueueKind;
  tone?: "amber" | "violet" | "sky";
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const items = useReviewQueueItems(kind, open);
  const toneCls = TONE[tone];

  return (
    <div>
      <Button
        variant="ghost"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex h-auto w-full items-center justify-between gap-3 px-5 py-3.5 text-left cursor-pointer"
      >
        <span className="flex min-w-0 items-center gap-3">
          {Icon && (
            <Icon
              aria-hidden="true"
              className={cn("h-4 w-4 shrink-0", toneCls.icon)}
            />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-m3-on-surface">
              {label}
            </span>
            {hint && (
              <span className="block truncate text-xs text-m3-on-surface-variant">
                {hint}
              </span>
            )}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
              toneCls.chip,
            )}
          >
            {count}
          </span>
          {open ? (
            <ChevronDown aria-hidden="true" className="h-4 w-4 text-m3-outline" />
          ) : (
            <ChevronRight
              aria-hidden="true"
              className="h-4 w-4 text-m3-outline transition-transform group-hover:translate-x-0.5"
            />
          )}
        </span>
      </Button>

      {open && (
        <div className="border-t border-m3-outline-variant/20 bg-m3-surface-container-lowest">
          {items.isLoading ? (
            <p className="px-5 py-3 text-xs text-m3-on-surface-variant">
              {t("teacher_dashboard.review.loading_items")}
            </p>
          ) : items.isError ? (
            <p className="px-5 py-3 text-xs text-danger">
              {t("teacher_dashboard.review.items_failed")}
            </p>
          ) : (items.data ?? []).length === 0 ? (
            // Reachable when the badge was computed on a stale stats query and
            // the work has since been cleared — say so rather than render an
            // empty box.
            <p className="px-5 py-3 text-xs text-m3-on-surface-variant">
              {t("teacher_dashboard.review.items_empty")}
            </p>
          ) : (
            <ul>
              {(items.data ?? []).map((item) => (
                <li key={`${item.course_id}:${item.target_id}`}>
                  <ReviewItemLink kind={kind} item={item}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-m3-on-surface">
                        {item.target_title}
                      </span>
                      <span className="block truncate text-xs text-m3-on-surface-variant">
                        {item.course_title}
                        {item.module_title ? ` · ${item.module_title}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-semibold tabular-nums text-m3-on-surface-variant">
                        {item.count}
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-m3-outline"
                      />
                    </span>
                  </ReviewItemLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default ExpandableReviewRow;
