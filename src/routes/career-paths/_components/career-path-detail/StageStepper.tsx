import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Play,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { useStartCourse } from "@/lib/api/hooks/career-paths";
import { Button } from "@/components/ui/button";
import type {
  CareerPathCoursePublic,
  CourseProgressSummaryWithStage,
  StageProgressRead,
} from "@/lib/api/types";

/**
 * Student-facing stage stepper.
 *
 * Locked stages are GREYED, never hidden — a student should be able to see
 * what is coming and why it is closed. `enforcement` decides whether a locked
 * stage's courses are actually unreachable (`hard`) or merely flagged
 * (`soft`/`advisory`).
 */
export function StageStepper({
  careerPathId,
  stages,
  courseMeta,
  overConcurrencyCap,
  activeInPath,
}: {
  careerPathId: string;
  stages: StageProgressRead[];
  /** Slug/title per course id, from the published path payload. */
  courseMeta: Map<string, CareerPathCoursePublic>;
  overConcurrencyCap?: boolean;
  activeInPath?: number;
}) {
  const { t } = useTranslation();
  const prefix = "career_path_detail.stages";

  return (
    <section className="space-y-4">
      <SectionHeader
        title={t(`${prefix}.title`)}
        subtitle={t(`${prefix}.subtitle`)}
      />

      {/* The attention cap is advisory: it warns, it never blocks. */}
      {overConcurrencyCap && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            {t(`${prefix}.cap_warning`, { count: activeInPath ?? 0 })}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {stages.map((stage) => (
          <StageBlock
            key={stage.stage_id}
            careerPathId={careerPathId}
            stage={stage}
            courseMeta={courseMeta}
          />
        ))}
      </div>
    </section>
  );
}

function StageBlock({
  careerPathId,
  stage,
  courseMeta,
}: {
  careerPathId: string;
  stage: StageProgressRead;
  courseMeta: Map<string, CareerPathCoursePublic>;
}) {
  const { t } = useTranslation();
  const prefix = "career_path_detail.stages";
  const label =
    stage.title?.trim() ||
    t(`${prefix}.unnamed`, { position: stage.position });

  const badge = stage.complete
    ? { text: t(`${prefix}.done`), cls: "bg-emerald-100 text-emerald-800" }
    : stage.unlocked
      ? { text: t(`${prefix}.open`), cls: "bg-m3-primary-fixed text-m3-primary" }
      : { text: t(`${prefix}.locked`), cls: "bg-m3-surface-container text-m3-on-surface-variant" };

  return (
    <div
      className={
        stage.unlocked
          ? "rounded-2xl bg-card ghost-border p-4"
          : // Greyed, not hidden.
            "rounded-2xl bg-m3-surface-container-lowest ghost-border p-4 opacity-70"
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            stage.complete
              ? "flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 shrink-0"
              : "flex items-center justify-center w-9 h-9 rounded-full bg-m3-primary-fixed text-m3-primary shrink-0 font-headline font-bold text-sm"
          }
        >
          {stage.complete ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : stage.unlocked ? (
            stage.position
          ) : (
            <Lock className="h-4 w-4 text-m3-on-surface-variant" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-headline font-semibold text-sm text-m3-on-surface">
              {label}
            </h3>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${badge.cls}`}
            >
              {badge.text}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-m3-on-surface-variant">
            <span>
              {t(`${prefix}.progress`, {
                done: stage.stage_done,
                total: stage.stage_total,
              })}
            </span>
            {stage.min_optional_to_complete > 0 && (
              <span>
                {t(`${prefix}.optional_quota`, {
                  count: stage.min_optional_to_complete,
                })}
              </span>
            )}
          </div>
          {stage.description && (
            <p className="mt-1 text-[11px] text-m3-on-surface-variant">
              {stage.description}
            </p>
          )}
          {!stage.unlocked && (
            <p className="mt-2 text-[11px] text-m3-on-surface-variant flex items-start gap-1.5">
              <Lock className="h-3 w-3 shrink-0 mt-0.5" />
              <span>
                {t(`${prefix}.locked_reason.${stage.unlock_policy}`, {
                  defaultValue:
                    stage.enforcement === "hard"
                      ? t(`${prefix}.locked_hard`)
                      : t(`${prefix}.locked_soft`),
                })}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {stage.courses.map((course) => (
          <StageCourseRow
            key={course.course_id}
            careerPathId={careerPathId}
            course={course}
            stage={stage}
            slug={courseMeta.get(course.course_id)?.slug ?? course.slug}
          />
        ))}
      </div>
    </div>
  );
}

/** Progress bar plus the "4/6 done" count for an enrolled course.
 *
 * Extracted from ``StageCourseRow`` to keep that function under the
 * complexity ceiling: adding the unit counts pushed it to 16 (max 15). The
 * split is along a real seam — this is the only part of the row that renders
 * progress, and it needs nothing but the two numbers.
 */
function CourseUnitProgress({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation();
  const percent = total > 0 ? Math.round((done * 100) / total) : 0;
  return (
    <div className="mt-2">
      <div className="h-1.5 w-full bg-m3-surface-container rounded-full overflow-hidden">
        <div
          className="h-full bg-m3-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      {/* Counts, not just a bar: completion spans lessons, quizzes and
          interviews now, so "4/6 done" tells a student there is something
          left without making them hunt for which item. */}
      {total > 0 && (
        <p className="mt-1 text-[11px] text-m3-on-surface-variant">
          {t("career_path_detail.stages.units_done", { done, total })}
        </p>
      )}
    </div>
  );
}

function StageCourseRow({
  careerPathId,
  course,
  stage,
  slug,
}: {
  careerPathId: string;
  course: CourseProgressSummaryWithStage;
  stage: StageProgressRead;
  slug: string;
}) {
  const { t } = useTranslation();
  const prefix = "career_path_detail.stages";
  const start = useStartCourse(careerPathId);

  // `satisfied` is the enrollment status, NOT completion_percent. Both are now
  // measured over the same gradeable units (lessons + quizzes + interviews),
  // but they still differ for a course the student never enrolled in: that has
  // no status row at all, so it can read 100% and remain unsatisfied.
  const satisfied = course.satisfied === true;
  const enrolled = course.is_enrolled === true;
  const unitTotal = course.unit_total ?? 0;
  const unitDone = course.unit_done ?? 0;
  // `hard` enforcement on a locked stage is the only case that truly blocks.
  const blocked = !stage.unlocked && stage.enforcement === "hard";

  function handleStart() {
    start.mutate(course.course_id, {
      onSuccess: (result) => {
        if (!result.created) {
          toast.info(t(`${prefix}.already_started`));
        }
        if (result.over_concurrency_cap) {
          // Use the count the server actually measured. This was hardcoded to
          // 0 once, which rendered "you have 0 courses open in this path" —
          // the one number that can never be true when the cap is exceeded.
          toast.warning(
            t(`${prefix}.cap_warning`, { count: result.active_in_path ?? 0 }),
          );
        }
        // The stage was locked but its enforcement is soft/advisory, so the
        // server let the Start through. Say so — otherwise "allowed" and
        // "allowed while locked" look identical to the student.
        if (result.stage_locked_warning) {
          toast.warning(t(`${prefix}.started_while_locked`));
        }
      },
      onError: (err) =>
        toast.error((err as Error).message || t(`${prefix}.start_failed`)),
    });
  }

  const body = (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-m3-surface-container-low ghost-border">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {course.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-m3-on-surface-variant">
          <span className="font-mono truncate">{slug}</span>
          <span
            className={
              course.is_required
                ? "text-m3-primary font-semibold"
                : undefined
            }
          >
            {course.is_required
              ? t("career_path_detail.course_required")
              : t("career_path_detail.course_optional")}
          </span>
          {!enrolled && <span>{t(`${prefix}.not_started_yet`)}</span>}
        </div>
        {enrolled && <CourseUnitProgress done={unitDone} total={unitTotal} />}
      </div>
      {satisfied ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
      ) : enrolled ? (
        <ArrowRight className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
      ) : (
        <Button variant="ghost"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleStart();
          }}
          disabled={blocked || start.isPending}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-m3-primary text-m3-on-primary text-xs font-semibold shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Play className="h-3 w-3" />
          {start.isPending ? t(`${prefix}.starting`) : t(`${prefix}.start`)}
        </Button>
      )}
    </div>
  );

  // A course the student has not started has no course page to visit yet, and
  // a hard-locked stage must not be navigable at all.
  if (blocked || !enrolled) return body;

  return (
    <Link to="/courses/$slug" params={{ slug }} className="block">
      {body}
    </Link>
  );
}
