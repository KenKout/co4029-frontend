import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, CircleDashed, X } from "lucide-react";
import { useCourseReadiness } from "@/lib/api/hooks/dept";
import { cn } from "@/lib/utils";

/**
 * Is this course actually deliverable?
 *
 * Three things decide it, and every one of them used to be discoverable only by
 * failing: no teacher (nobody authors the content), no gradeable unit (the
 * publish gate 409s), no learning outcome (also a publish gate), plus the
 * course's own status.
 *
 * Career-path placement is NOT here. It was never a publish gate — the backend
 * gates on gradeable units, learning outcomes and the teacher minimum — so a
 * red X for "not on a career path" reported a course as broken over something
 * that blocks nothing, on a screen whose job is to predict the publish
 * decision. Where the course sits in the curriculum now lives on the course's
 * own Career Paths tab, which can also link through to the stage.
 *
 * The content row and the publish button read the SAME number the backend gate
 * reads, so this cannot show a green tick next to a publish that then 409s.
 */
export function ReadinessChecklist({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useCourseReadiness(courseId);

  if (isLoading || !data) {
    return (
      <div className="h-28 bg-surface-muted animate-pulse rounded-xl" />
    );
  }

  const rows = [
    {
      key: "teacher",
      ok: data.teacher_count > 0,
      label: t("dept_course_detail.readiness.teacher"),
      detail:
        data.teacher_count > 0
          ? t("dept_course_detail.readiness.teacher_ok", {
              count: data.teacher_count,
            })
          : t("dept_course_detail.readiness.teacher_missing"),
    },
    {
      key: "content",
      ok: data.gradeable_unit_count > 0,
      label: t("dept_course_detail.readiness.content"),
      detail:
        data.gradeable_unit_count > 0
          ? t("dept_course_detail.readiness.content_ok", {
              count: data.gradeable_unit_count,
            })
          : t("dept_course_detail.readiness.content_missing"),
    },
    {
      key: "outcomes",
      ok: data.learning_outcome_count > 0,
      label: t("dept_course_detail.readiness.outcomes"),
      detail:
        data.learning_outcome_count > 0
          ? t("dept_course_detail.readiness.outcomes_ok", {
              count: data.learning_outcome_count,
            })
          : t("dept_course_detail.readiness.outcomes_missing"),
    },
    {
      key: "published",
      ok: data.status === "published",
      label: t("dept_course_detail.readiness.published"),
      detail: t(`dept_course_detail.readiness.status_${data.status}`, {
        defaultValue: data.status,
      }),
    },
  ];

  return (
    <div className="rounded-xl border border-m3-outline-variant/20 p-5 space-y-3">
      <h3 className="text-sm font-bold text-m3-on-surface">
        {t("dept_course_detail.readiness.title")}
      </h3>

      {/* A REQUIRED course with nothing to grade is not just incomplete: no
          student can ever satisfy it, so its stage and every stage behind it
          stay locked. Louder than a plain unticked row. */}
      {data.blocks_required_stage && (
        <p className="flex items-start gap-2 text-xs text-m3-error bg-m3-error/5 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{t("dept_course_detail.readiness.blocks_stage")}</span>
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.key} className="flex items-start gap-2.5 text-sm">
            {row.ok ? (
              <Check className="h-4 w-4 shrink-0 mt-0.5 text-m3-primary" />
            ) : row.key === "published" ? (
              // Draft is a legitimate state, not a failure — an unpublished
              // course under construction should not be shown as broken.
              <CircleDashed className="h-4 w-4 shrink-0 mt-0.5 text-m3-on-surface-variant" />
            ) : (
              <X className="h-4 w-4 shrink-0 mt-0.5 text-m3-error" />
            )}
            <span className="flex-1">
              <span
                className={cn(
                  "font-medium",
                  row.ok ? "text-m3-on-surface" : "text-m3-on-surface-variant",
                )}
              >
                {row.label}
              </span>
              <span className="block text-xs text-m3-on-surface-variant">
                {row.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
