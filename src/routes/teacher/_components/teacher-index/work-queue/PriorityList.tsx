import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileStack,
  Mic,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PriorityTask, ReviewQueueKind } from "@/lib/api/hooks/teacher-courses";
import { cn } from "@/lib/utils";

import { formatAge, formatAgeFull, priorityTaskLink } from "./priority-helpers";
import type { TranslateFn } from "../types";

const KIND_ICON: Record<PriorityTask["kind"], typeof UserRound> = {
  student_risk: UserRound,
  quiz_questions_pending: ClipboardCheck,
  interview_questions_pending: Mic,
  quiz_calibration: AlertTriangle,
  materials_ready: FileStack,
  reviews_overdue: Clock,
};

/**
 * Grouped content backlogs act as a shortcut INTO the "Needs your review"
 * section: clicking one scrolls down and expands the matching category,
 * where the per-item deep links live. (`reviews_overdue` stopped shipping
 * in the feed — teachers cannot clear student review cards, so it moved to
 * the footer insights; the type value stays for defensive rendering.)
 */
const DRILLDOWN_KIND: Partial<
  Record<PriorityTask["kind"], ReviewQueueKind>
> = {
  quiz_questions_pending: "quiz-cards",
  quiz_calibration: "missing-texp",
  interview_questions_pending: "interview-questions",
  materials_ready: "materials",
};

/**
 * The ranked "All" view of the Work Queue: the teacher's next actions
 * across every kind of work.
 *
 * The feed deliberately mixes named students with grouped content
 * backlogs. What is most urgent on a teacher's plate is not sorted by
 * which section of the dashboard it belongs to, and the previous layout
 * forced exactly that — a student two weeks silent sat below the fold
 * while a review backlog took the top of the page.
 *
 * The server ranks and caps the list; this renders it. No sorting happens
 * here, so the order cannot drift from the rule the API documents.
 */
export function PriorityList({
  tasks,
  isLoading,
  onFocusReview,
  t,
}: {
  tasks: PriorityTask[];
  isLoading: boolean;
  /** Switches the Work Queue to Content and expands one category. */
  onFocusReview: (kind: ReviewQueueKind) => void;
  t: TranslateFn;
}) {
  if (isLoading) return <Skeletons />;
  if (tasks.length === 0) return null;
  return (
    <ol className="divide-y divide-m3-outline-variant/20">
      {tasks.map((task) => (
        <li key={task.id}>
          <TaskRow task={task} onFocusReview={onFocusReview} t={t} />
        </li>
      ))}
    </ol>
  );
}

function TaskRow({
  task,
  onFocusReview,
  t,
}: {
  task: PriorityTask;
  onFocusReview: (kind: ReviewQueueKind) => void;
  t: TranslateFn;
}) {
  const drillKind = DRILLDOWN_KIND[task.kind];

  // Grouped backlogs act as a shortcut into the matching "Needs your
  // review" category: the click scrolls down and expands it there.
  if (drillKind) {
    return (
      <Button
        variant="ghost"
        type="button"
        onClick={() => onFocusReview(drillKind)}
        className="group flex h-auto w-full items-center gap-4 px-4 py-4 text-left cursor-pointer"
      >
        <TaskBody task={task} t={t} hasLink={false} expandable />
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-m3-outline"
        />
      </Button>
    );
  }

  const link = priorityTaskLink(task);
  const body = <TaskBody task={task} t={t} hasLink={link !== null} />;

  // A grouped backlog spanning several courses has no single destination.
  // Rendering it as a dead link would be worse than rendering it as text.
  if (!link) {
    return <div className="flex items-center gap-4 p-4">{body}</div>;
  }
  return (
    <Link
      {...link}
      className="group flex items-center gap-4 p-4 transition-colors hover:bg-m3-surface-container-low"
    >
      {body}
    </Link>
  );
}

function TaskBody({
  task,
  t,
  hasLink,
  expandable = false,
}: {
  task: PriorityTask;
  t: TranslateFn;
  hasLink: boolean;
  expandable?: boolean;
}) {
  const Icon = KIND_ICON[task.kind];
  // "Oldest: 98 days" — for grouped backlogs the age is the oldest
  // item's wait time, and a bare "98d" reads as the item's own age.
  const age = formatAge(task.age_hours);
  const isGrouped = Boolean(DRILLDOWN_KIND[task.kind]);
  const ageLabel = isGrouped && age
    ? t("teacher_dashboard.priority.oldest", {
        age: formatAgeFull(task.age_hours),
      })
    // Student rows: the age is the last-activity window, which no longer
    // matches the headline reason now that assessment failures lead — say
    // what the number measures instead of letting it hang ("Last active:
    // 36d ago", not a bare "36d" next to a failure reason).
    : task.kind === "student_risk" && age
      ? t("teacher_dashboard.priority.last_active", {
          age,
          suffix: age === "just now" ? "" : " ago",
        })
      : age;

  return (
    <>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          task.severity === "high"
            ? "bg-destructive/10 text-destructive"
            : "bg-m3-surface-container text-m3-on-surface-variant",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-semibold text-text-strong">
            {task.title}
          </span>
          {/* Blocking is stated as a word, not implied by colour: it is the
              single fact that moved this row to the top. */}
          {task.blocking ? (
            <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-destructive uppercase">
              {t("teacher_dashboard.priority.blocking")}
            </span>
          ) : null}
          {task.course_title ? (
            <span className="truncate text-xs text-text-muted">
              {task.course_title}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs text-text-muted">
          {task.reason}
        </span>
      </span>

      {/* Age is omitted entirely when unknown — "0h" would claim the item
          just arrived, which is the opposite of what null means. */}
      {ageLabel ? (
        <span className="hidden shrink-0 text-xs text-text-muted tabular-nums sm:inline">
          {ageLabel}
        </span>
      ) : null}

      {!expandable ? (
        hasLink ? (
          <ArrowGlyph />
        ) : (
          <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
        )
      ) : null}
    </>
  );
}

function ArrowGlyph() {
  return (
    <span
      aria-hidden="true"
      className="shrink-0 text-m3-outline opacity-0 transition-opacity group-hover:opacity-100"
    >
      <ChevronRight className="h-4 w-4" />
    </span>
  );
}

function Skeletons() {
  return (
    <div className="divide-y divide-m3-outline-variant/20">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-m3-surface-container" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 animate-pulse rounded bg-m3-surface-container" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-m3-surface-container" />
          </div>
        </div>
      ))}
    </div>
  );
}