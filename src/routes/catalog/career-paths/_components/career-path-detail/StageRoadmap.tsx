import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
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
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-headline text-lg font-bold text-text-strong">
          Roadmap
        </h2>
        <p className="mt-0.5 text-sm text-text-muted">
          Stages unlock in order as you complete them.
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
                    {stage.title ?? `Stage ${stage.position}`}
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
                {stage.required_count} required
                {stage.optional_count > 0
                  ? ` · ${stage.optional_count} optional`
                  : ""}
                {stage.min_optional_to_complete > 0
                  ? ` (complete at least ${stage.min_optional_to_complete})`
                  : ""}
              </p>

              <ul className="mt-3 space-y-1.5">
                {stage.courses.map((course) => (
                  <li key={course.course_id}>
                    <Link
                      to="/courses/$slug"
                      params={{ slug: course.slug }}
                      className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-m3-surface-container-low"
                    >
                      {course.is_required ? (
                        <Star className="h-3.5 w-3.5 shrink-0 text-m3-primary" />
                      ) : (
                        <span className="inline-block h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm text-text-strong">
                        {course.title}
                      </span>
                      {!course.is_required ? (
                        <span className="shrink-0 text-[10px] tracking-wide text-text-muted uppercase">
                          Optional
                        </span>
                      ) : null}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
                {stage.courses.length === 0 ? (
                  <li className="px-2 py-1.5 text-xs text-text-muted">
                    No courses in this stage yet.
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
 * What opens this stage.
 *
 * `always` gets no badge — a stage with no gate needs no explanation, and
 * labelling every one of them would bury the stages that DO gate.
 */
function UnlockHint({ policy }: { policy: string }) {
  if (policy === "always") return null;
  const label =
    policy === "after_previous_required"
      ? "After previous required courses"
      : "After previous stage";
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
