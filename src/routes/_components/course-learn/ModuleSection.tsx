import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Play,
  CheckCircle2,
  PlayCircle,
  BookOpen,
  ChevronDown,
  Mic,
  Sparkles,
  HelpCircle,
  // Lock,
} from "lucide-react";
import type {
  InterviewProgressRead,
  InterviewSessionPublic,
  ModulePublic,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { moduleIsComplete } from "./helpers";
import { interviewRowBadge } from "./interview-row-badge";
import type { InterviewRowBadge } from "./interview-row-badge";
import type { FlatItem, LessonState, Translate } from "./types";

/**
 * One collapsible module in the curriculum, plus the rows it holds. Rendered
 * both by the course-home curriculum and by the lesson-mode sidebar, so the
 * row markup lives here rather than in either caller.
 */
export function ModuleSection({
  mod,
  flatItems,
  lessonItems,
  itemState,
  onSelect,
  slug,
  isActiveModule,
  inProgressByConfigId,
  interviewProgressMap,
  nextItemId,
}: {
  mod: ModulePublic;
  flatItems: FlatItem[];
  lessonItems: FlatItem[];
  itemState: (fi: FlatItem) => LessonState;
  onSelect: (idx: number) => void;
  slug: string;
  isActiveModule: boolean;
  inProgressByConfigId: Map<string, InterviewSessionPublic>;
  interviewProgressMap?: Map<string, InterviewProgressRead>;
  nextItemId?: string;
}) {
  const { t } = useTranslation();
  const modItems = flatItems
    .map((fi) => ({
      fi,
      idx: lessonItems.findIndex((lesson) => lesson.item.id === fi.item.id),
    }))
    .filter(({ fi }) => fi.moduleId === mod.id);

  // Extraneous-load reduction: a module whose every item is completed
  // collapses on its own (the checkmark rows no longer need attention);
  // incomplete modules stay expanded so the remaining work is visible. The
  // module holding the active lesson always opens, and a manual toggle
  // persists until the completion state actually changes.
  const moduleComplete = moduleIsComplete(mod, flatItems, itemState);
  const derivedOpen = isActiveModule || !moduleComplete;
  const [open, setOpen] = useState(derivedOpen);
  const [lastDerived, setLastDerived] = useState(derivedOpen);

  // Keep the module containing the active lesson expanded even if the
  // student navigates between modules without manually re-opening it, and
  // auto-collapse the moment a module becomes fully complete (or re-expand
  // if it stops being complete).
  useEffect(() => {
    if (derivedOpen !== lastDerived) {
      setOpen(derivedOpen);
      setLastDerived(derivedOpen);
    }
  }, [derivedOpen, lastDerived]);

  if (!modItems.length) return null;

  return (
    <div className="space-y-1">
      <Button variant="ghost"
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-m3-primary/5 group cursor-pointer h-auto whitespace-normal"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 text-m3-outline shrink-0 transition-transform duration-300 group-hover:text-m3-primary",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
        <span className="text-[10px] font-bold text-m3-outline uppercase tracking-tight transition-colors group-hover:text-m3-primary">
          {mod.title}
        </span>
      </Button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden min-h-0 space-y-1">
          {modItems.map(({ fi, idx }) => (
            <CurriculumItemRow
              key={fi.item.id}
              fi={fi}
              idx={idx}
              state={itemState(fi)}
              onSelect={onSelect}
              slug={slug}
              inProgressByConfigId={inProgressByConfigId}
              interviewProgressMap={interviewProgressMap}
              isNextUp={fi.item.id === nextItemId}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The badge for an interview row, or `null` for any other item type.
 *
 * A thin wrapper over `interviewRowBadge` that also does the item-type and
 * target-id narrowing — inlining those two checks in `CurriculumItemRow` tips
 * it past the eslint complexity ceiling (15), which tsc and the build do not
 * catch.
 */
function badgeForRow(
  fi: FlatItem,
  interviewProgressMap?: Map<string, InterviewProgressRead>,
): InterviewRowBadge {
  if (fi.item.item_type !== "interview") return null;
  const configId = fi.item.target?.id;
  if (!configId) return null;
  return interviewRowBadge(interviewProgressMap?.get(configId));
}

/**
 * A single curriculum row. Lessons are buttons that swap the player, quizzes
 * and interviews are links into their own sub-routes, and an interview with a
 * live session is disabled in favour of a "continue" card.
 */
function CurriculumItemRow({
  fi,
  idx,
  state,
  onSelect,
  slug,
  inProgressByConfigId,
  interviewProgressMap,
  isNextUp,
  t,
}: {
  fi: FlatItem;
  idx: number;
  state: LessonState;
  onSelect: (idx: number) => void;
  slug: string;
  inProgressByConfigId: Map<string, InterviewSessionPublic>;
  interviewProgressMap?: Map<string, InterviewProgressRead>;
  isNextUp: boolean;
  t: Translate;
}) {
  const isQuiz = fi.item.item_type === "quiz";
  const isInterview = fi.item.item_type === "interview";
  const quizId = isQuiz ? fi.item.target?.id : null;
  // Distinguishes "attempted but not passed" and "awaiting marking" from
  // "never opened", all three of which are otherwise the same pending row.
  const badge = badgeForRow(fi, interviewProgressMap);

  const className = cn(
    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 text-sm",
    state === "active" && "bg-m3-primary text-white shadow-md font-bold",
    state === "completed" &&
      "bg-m3-surface-container-lowest text-m3-primary shadow-sm font-medium hover:bg-m3-surface-container",
    state === "pending" &&
      "text-m3-on-surface-variant hover:bg-white/50 font-medium",
    // The earliest item still to do gets a soft inner glow + emphasis so
    // the student's eye lands on the exact next step without hunting
    // through the list. Inner (inset) rather than outer shadow because the
    // curriculum rows sit inside an overflow-hidden collapse container —
    // an outer glow would be clipped. No border/ring per feedback.
    isNextUp &&
      "bg-m3-secondary/10 font-bold text-m3-on-surface shadow-[inset_0_0_14px_2px_rgba(59,130,246,0.16)] hover:bg-m3-secondary/15",
    // state === "locked" && "opacity-40 cursor-not-allowed text-m3-outline", // DEV: comment out to disable lock
  );

  const inner = (
    <CurriculumItemInner
      state={state}
      isQuiz={isQuiz}
      isInterview={isInterview}
      label={fi.label}
      badge={badge}
      t={t}
    />
  );

  if (isQuiz && quizId) {
    return (
      <Link
        to="/courses/$slug/quiz/$quizId"
        params={{ slug, quizId }}
        className={className}
      >
        {inner}
      </Link>
    );
  }

  if (isInterview && fi.item.target?.id) {
    const configId = fi.item.target.id;
    const activeSession = inProgressByConfigId.get(configId);

    // An interview session is still occurring for this config: disable
    // the item (block starting a second session) and surface a compact
    // "in progress" card with a Continue action below it.
    if (activeSession) {
      return (
        <InterviewInProgressCard
          slug={slug}
          configId={configId}
          className={className}
          inner={inner}
          t={t}
        />
      );
    }

    return (
      <Link
        to="/courses/$slug/interview/$moduleId"
        params={{ slug, moduleId: configId }}
        className={className}
      >
        {inner}
      </Link>
    );
  }

  return (
    <Button variant="ghost"
      onClick={() => idx >= 0 && onSelect(idx)}
      disabled={idx < 0 /* || state === "locked" */} // DEV: uncomment state check to re-enable lock
      className={className}
    >
      {inner}
    </Button>
  );
}

/**
 * The small pill on a pending interview row.
 *
 * Amber for "not passed yet" (actionable — retake it), neutral for "being
 * marked" (nothing to do but wait). Deliberately NOT red: the interview is
 * retryable and `max_attempts` is unlimited on every config here, so a failure
 * is a step, not a dead end.
 */
function InterviewStateBadge({
  badge,
  t,
}: {
  badge: NonNullable<InterviewRowBadge>;
  t: Translate;
}) {
  const grading = badge.kind === "grading";
  return (
    <span
      className={cn(
        // No ml-auto: the label already carries flex-1, so the badge sits
        // right after the (truncated) title rather than being pushed away
        // from it.
        "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-tight",
        grading
          ? "bg-m3-surface-container text-m3-on-surface-variant"
          : "bg-amber-100 text-amber-700",
      )}
      aria-label={t(
        grading
          ? "course_learn.interview_grading_aria"
          : "course_learn.interview_not_passed_aria",
        { count: badge.attemptCount },
      )}
    >
      {t(
        grading
          ? "course_learn.interview_grading"
          : "course_learn.interview_not_passed",
      )}
    </span>
  );
}

/** The icon + label content shared by every curriculum row variant. */
function CurriculumItemInner({
  state,
  isQuiz,
  isInterview,
  label,
  badge,
  t,
}: {
  state: LessonState;
  isQuiz: boolean;
  isInterview: boolean;
  label: string;
  badge?: InterviewRowBadge;
  t: Translate;
}) {
  const LessonIcon = PlayCircle;

  return (
    <>
      {state === "completed" && (
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500 fill-emerald-100" />
      )}
      {/* {state === "locked" && <Lock className="h-4 w-4 flex-shrink-0" />} */}
      {/* DEV: comment out to disable lock */}
      {state === "active" && <LessonIcon className="h-4 w-4 flex-shrink-0" />}
      {state === "pending" && !isQuiz && !isInterview && (
        <LessonIcon className="h-4 w-4 flex-shrink-0 opacity-40" />
      )}
      {state === "pending" && isQuiz && (
        <HelpCircle className="h-4 w-4 flex-shrink-0 opacity-60" />
      )}
      {isInterview && <Mic className="h-4 w-4 flex-shrink-0" />}
      {isQuiz && state !== "active" && (
        <Sparkles className="h-3 w-3 ml-auto text-m3-secondary" />
      )}

      <span className="truncate leading-snug flex-1">{label}</span>
      {badge && <InterviewStateBadge badge={badge} t={t} />}
      <BookOpen className="h-3 w-3 opacity-0" />
    </>
  );
}

/** Disabled interview row + the "session still running" continue card. */
function InterviewInProgressCard({
  slug,
  configId,
  className,
  inner,
  t,
}: {
  slug: string;
  configId: string;
  className: string;
  inner: ReactNode;
  t: Translate;
}) {
  return (
    <div className="space-y-1">
      <div
        className={cn(className, "opacity-60 cursor-not-allowed")}
        aria-disabled="true"
      >
        {inner}
      </div>
      <div
        className="ml-2 rounded-lg border border-m3-primary/30 bg-m3-primary/5 p-3"
        role="status"
      >
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-m3-primary motion-safe:animate-pulse"
            aria-hidden="true"
          />
          <span className="text-[10px] font-bold uppercase tracking-tight text-m3-primary">
            {t("course_learn.interview_in_progress.badge")}
          </span>
        </div>
        <p className="mt-1.5 text-xs font-semibold text-m3-on-surface">
          {t("course_learn.interview_in_progress.title")}
        </p>
        <p className="mt-0.5 text-[11px] leading-4 text-m3-on-surface-variant">
          {t("course_learn.interview_in_progress.body")}
        </p>
        <Link
          to="/courses/$slug/interview/$moduleId"
          params={{ slug, moduleId: configId }}
          className="mt-2.5 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-m3-primary px-3 text-xs font-bold text-white transition-colors hover:bg-m3-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/60"
        >
          <Play className="h-3.5 w-3.5" />
          {t("course_learn.interview_in_progress.continue")}
        </Link>
      </div>
    </div>
  );
}
