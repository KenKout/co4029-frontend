import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileStack,
  Mic,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import {
  useReviewQueueItems,
  type PriorityTask,
  type ReviewQueueItem,
  type ReviewQueueKind,
} from "@/lib/api/hooks/teacher-courses";
import { cn } from "@/lib/utils";

import { ReviewItemLink } from "./ReviewQueueLinks";
import { formatAge, formatAgeFull, priorityTaskLink } from "./priority-helpers";
import type { TranslateFn } from "./types";

const KIND_ICON: Record<PriorityTask["kind"], typeof UserRound> = {
  student_risk: UserRound,
  quiz_questions_pending: ClipboardCheck,
  interview_questions_pending: Mic,
  quiz_calibration: AlertTriangle,
  materials_ready: FileStack,
  reviews_overdue: Clock,
};

/**
 * Grouped content backlogs drill into the same per-course lists as the
 * "Needs your review" section, via the review-queue endpoint. Each expanded
 * row is a real deep link to the place the work is done (quiz page,
 * interview config, lesson page).
 *
 * `reviews_overdue` has no drill-down endpoint (spaced-repetition cards do
 * not expose a per-course list), so those rows stay informational.
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
 * Priority Today: the teacher's next actions, ranked across every kind of
 * work.
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
export function PriorityTodaySection({
  tasks,
  isLoading,
  t,
}: {
  tasks: PriorityTask[];
  isLoading: boolean;
  t: TranslateFn;
}) {
  return (
    <div>
      <SectionHeader
        title={t("teacher_dashboard.priority.title")}
        subtitle={t("teacher_dashboard.priority.subtitle")}
      />

      {isLoading ? (
        <Skeletons />
      ) : tasks.length > 0 ? (
        <ol className="mt-4 divide-y divide-m3-outline-variant/20 overflow-hidden rounded-xl bg-card shadow-editorial ghost-border">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskRow task={task} t={t} />
            </li>
          ))}
        </ol>
      ) : (
        <NoUrgentActions t={t} />
      )}
    </div>
  );
}

function TaskRow({ task, t }: { task: PriorityTask; t: TranslateFn }) {
  const drillKind = DRILLDOWN_KIND[task.kind];

  // Grouped backlogs are expandable: the row is the summary, the expanded
  // list is where the work actually lives (one deep link per item).
  if (drillKind) {
    return <ExpandableTaskRow task={task} kind={drillKind} t={t} />;
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

function ExpandableTaskRow({
  task,
  kind,
  t,
}: {
  task: PriorityTask;
  kind: ReviewQueueKind;
  t: TranslateFn;
}) {
  const [open, setOpen] = useState(false);
  const items = useReviewQueueItems(kind, open);
  const body = <TaskBody task={task} t={t} hasLink={false} expandable />;

  return (
    <div>
      <Button
        variant="ghost"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex h-auto w-full items-center gap-4 px-4 py-4 text-left cursor-pointer"
      >
        {body}
        {open ? (
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-m3-outline"
          />
        ) : (
          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-m3-outline transition-transform group-hover:translate-x-0.5"
          />
        )}
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
            <p className="px-5 py-3 text-xs text-m3-on-surface-variant">
              {t("teacher_dashboard.review.items_empty")}
            </p>
          ) : (
            <ul>
              {(items.data ?? []).map((item: ReviewQueueItem) => (
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
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-m3-on-surface-variant">
                      {item.count}
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

/**
 * FR-015: an empty feed states the good news and offers somewhere to go,
 * rather than leaving a blank block the teacher has to interpret.
 */
function NoUrgentActions({ t }: { t: TranslateFn }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl bg-card p-5 shadow-editorial ghost-border">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-m3-primary" />
      <div>
        <p className="text-sm font-medium text-text-strong">
          {t("teacher_dashboard.priority.empty_title")}
        </p>
        <p className="text-xs text-text-muted">
          {t("teacher_dashboard.priority.empty_hint")}
        </p>
      </div>
    </div>
  );
}

function Skeletons() {
  return (
    <div className="mt-4 divide-y divide-m3-outline-variant/20 overflow-hidden rounded-xl bg-card shadow-editorial ghost-border">
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