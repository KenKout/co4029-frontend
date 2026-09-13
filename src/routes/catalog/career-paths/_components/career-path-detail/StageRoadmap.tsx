import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CourseListRow } from "@/routes/courses/_components/courses-list/CourseListRow";
import type { CareerPathStagePublic } from "@/lib/api/hooks/career-paths";

/**
 * The stage roadmap for a student who is NOT enrolled.
 *
 * Distinct from `StageStepper`, which an enrolled student sees: that one
 * renders live unlock/complete state and a Start button per course. Nothing
 * here is evaluated against a person — there is no enrollment to evaluate
 * against — so this shows the SHAPE of the journey: the stages in order,
 * what gates each one, and which courses sit inside.
 *
 * Courses link through to the course page so "what will I actually study"
 * is answerable before committing, which is the question this screen exists
 * to answer.
 */
export function StageRoadmap({ stages }: { stages: CareerPathStagePublic[] }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-headline text-lg font-bold text-text-strong">
          {t("career_path_detail.roadmap.title")}
        </h2>
        <p className="mt-0.5 text-sm text-text-muted">
          {t("career_path_detail.roadmap.subtitle")}
        </p>
      </div>

      <ol className="space-y-3">
        {stages.map((stage, index) => (
          <li key={stage.stage_id} className="relative pl-8">
            {/* Connector line between stage markers, stopping at the last so
                the timeline does not dangle past the final stage. */}
            {index < stages.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-8 bottom-[-0.75rem] left-[0.9375rem] w-px bg-m3-outline-variant/50"
              />
            ) : null}
            <span className="absolute top-1 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-m3-primary-fixed text-sm font-bold text-m3-primary">
              {stage.position}
            </span>

            <div className="rounded-xl border border-m3-outline-variant/40 bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-text-strong">
                    {/* Unnamed stages come back NULL so the label can be
                        localised here rather than in the database. */}
                    {stage.title ??
                      t("career_path_detail.roadmap.stage_fallback", {
                        position: stage.position,
                      })}
                  </h3>
                  {stage.description ? (
                    <p className="mt-0.5 text-xs text-text-muted">
                      {stage.description}
                    </p>
                  ) : null}
                </div>
                <UnlockHint policy={stage.unlock_policy} />
              </div>

              <p className="mt-2 text-xs text-text-muted">
                {t("career_path_detail.roadmap.counts_required", {
                  count: stage.required_count,
                })}
                {stage.optional_count > 0
                  ? ` · ${t("career_path_detail.roadmap.counts_optional", {
                      count: stage.optional_count,
                    })}`
                  : ""}
                {stage.min_optional_to_complete > 0
                  ? ` (${t("career_path_detail.roadmap.counts_min_optional", {
                      count: stage.min_optional_to_complete,
                    })})`
                  : ""}
              </p>

              {/* The catalogue's list row, so a course looks the same here as
                  on /courses. Required-ness rides in the `meta` slot, which is
                  the one thing the catalogue has no concept of. */}
              <ul className="mt-3 space-y-2">
                {stage.courses.map((course) => (
                  <li key={course.course_id}>
                    <CourseListRow
                      course={course}
                      meta={<RequirementTag required={course.is_required} />}
                    />
                  </li>
                ))}
                {stage.courses.length === 0 ? (
                  <li className="px-2 py-1.5 text-xs text-text-muted">
                    {t("career_path_detail.roadmap.stage_empty")}
                  </li>
                ) : null}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Required vs optional, in the row's `meta` slot.
 *
 * The roadmap previously signalled this with a star icon and an "Optional"
 * word at opposite ends of the line; as a labelled tag it survives the row's
 * denser layout and reads the same at both ends of the pair.
 */
export function RequirementTag({ required }: { required: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
        required
          ? "bg-m3-primary/10 text-m3-primary"
          : "bg-m3-surface-container text-m3-on-surface-variant",
      )}
    >
      {t(
        required
          ? "career_path_detail.course_required"
          : "career_path_detail.course_optional",
      )}
    </span>
  );
}

/**
 * What opens this stage.
 *
 * `always` gets no badge — a stage with no gate needs no explanation, and
 * labelling every one of them would bury the stages that DO gate.
 */
function UnlockHint({ policy }: { policy: string }) {
  const { t } = useTranslation();
  if (policy === "always") return null;
  const label = t(
    policy === "after_previous_required"
      ? "career_path_detail.roadmap.unlock_after_previous_required"
      : "career_path_detail.roadmap.unlock_after_previous_stage",
  );
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1",
        "bg-m3-surface-container text-[11px] font-medium text-m3-on-surface-variant",
      )}
    >
      <Lock className="h-3 w-3" />
      {label}
    </span>
  );
}
