import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Signpost,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { LearningProgramEnrollment } from "@/lib/api/types";

/**
 * The "you still have to choose a career path" prompt.
 *
 * `awaiting_path` is a REQUIRED action, not a suggestion: until the student
 * commits to a path their program hands them no courses, so the dashboard
 * they land on is empty and every CTA on it points at a catalogue that cannot
 * help. The choosing UI already exists at /me/learning-programs — offered
 * paths as comparison cards — but nothing on the landing screen pointed at
 * it, which left the one student who has a mandatory next step looking at the
 * emptiest version of this page.
 *
 * Rendered ABOVE the stats and course sections for that reason: zeroed
 * counters are a consequence of the unmade choice, so the choice has to come
 * first.
 */
export function ChoosePathPrompt({
  enrollments,
}: {
  enrollments: LearningProgramEnrollment[];
}) {
  const { t } = useTranslation();
  const awaiting = enrollments.filter((e) => e.status === "awaiting_path");
  if (awaiting.length === 0) return null;

  // Naming the programme matters when a student belongs to more than one:
  // "choose a path" is ambiguous, "choose a path for <programme>" is not.
  const first = awaiting[0];
  const offered = first.paths.filter((p) => p.status !== "archived").length;

  return (
    <section className="rounded-xl border border-m3-primary/30 bg-m3-primary-fixed/40 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-m3-primary/10 p-2.5 text-m3-primary">
          <Signpost className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h2 className="font-headline text-lg font-bold text-m3-on-surface">
              {t("dashboard.choose_path.title")}
            </h2>
            <p className="mt-0.5 text-sm text-m3-on-surface-variant">
              {awaiting.length > 1
                ? t("dashboard.choose_path.body_many", {
                    count: awaiting.length,
                  })
                : t("dashboard.choose_path.body", {
                    program: first.program_name,
                    count: offered,
                  })}
            </p>
          </div>
          {awaiting.length > 1 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {awaiting.map((enrollment) => (
                <li
                  key={enrollment.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-m3-primary/15 bg-card/70 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-semibold text-m3-on-surface">
                    {enrollment.program_name}
                  </span>
                  <span className="shrink-0 text-xs text-m3-on-surface-variant">
                    {t("dashboard.choose_path.path_count", {
                      count: enrollment.paths.filter(
                        (path) => path.status !== "archived",
                      ).length,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <Link to="/me/learning-programs">
            <Button className="gap-2 font-semibold">
              {t("dashboard.choose_path.cta")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProgramStatus({ status }: { status: "active" | "completed" }) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="secondary"
      className={
        status === "completed"
          ? "bg-emerald-100 text-emerald-800"
          : "bg-m3-primary-fixed text-m3-primary"
      }
    >
      {status === "completed" ? (
        <CheckCircle2 aria-hidden="true" />
      ) : (
        <GraduationCap aria-hidden="true" />
      )}
      {t(`dashboard.learning_plan.status.${status}`)}
    </Badge>
  );
}

function PathProgress({
  enrollment,
  attempt,
}: {
  enrollment: LearningProgramEnrollment;
  attempt: LearningProgramEnrollment["attempts"][number];
}) {
  const { t } = useTranslation();
  const path = enrollment.paths.find(
    (item) => item.career_path_id === attempt.career_path_id,
  );
  if (!path) return null;

  return (
    <Link
      to="/catalog/career-paths/$slug"
      params={{ slug: path.slug }}
      search={{ enrollment: enrollment.id }}
      className="group block rounded-lg border border-m3-outline-variant/60 bg-m3-surface-container-low/60 p-3 transition-colors hover:border-m3-primary/35 hover:bg-m3-primary-fixed/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-m3-on-surface group-hover:text-m3-primary">
            {path.name}
          </p>
          <p className="mt-0.5 text-xs text-m3-on-surface-variant">
            {t("dashboard.learning_plan.course_progress", {
              completed: attempt.completed_courses,
              total: attempt.total_courses,
            })}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-m3-primary">
          {Math.round(attempt.progress_percent)}%
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-m3-surface-container-high">
        <div
          className="h-full rounded-full bg-m3-primary transition-[width] duration-500"
          style={{
            width: `${Math.min(100, Math.max(0, attempt.progress_percent))}%`,
          }}
        />
      </div>
    </Link>
  );
}

function ProgramPlanCard({
  enrollment,
}: {
  enrollment: LearningProgramEnrollment;
}) {
  const { t } = useTranslation();
  const attempts = enrollment.attempts.filter(
    (attempt) => attempt.status === "active" || attempt.status === "completed",
  );
  const visibleAttempts = attempts.slice(0, 3);

  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-m3-outline-variant/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-headline text-lg font-bold text-m3-on-surface">
            {enrollment.program_name}
          </h3>
          <p className="mt-0.5 text-xs text-m3-on-surface-variant">
            {t("dashboard.learning_plan.version", {
              version: enrollment.program_version_no,
            })}
          </p>
        </div>
        <ProgramStatus status={enrollment.status as "active" | "completed"} />
      </div>

      <div className="mt-4 rounded-lg bg-m3-primary-fixed/30 p-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-m3-on-surface">
            {t("dashboard.learning_plan.overall_progress")}
          </span>
          <span className="font-bold tabular-nums text-m3-primary">
            {Math.round(enrollment.current_progress_percent)}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-card/80">
          <div
            className="h-full rounded-full bg-m3-primary transition-[width] duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, enrollment.current_progress_percent))}%`,
            }}
          />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          {t("dashboard.learning_plan.course_progress", {
            completed: enrollment.current_completed_courses,
            total: enrollment.current_total_courses,
          })}
        </p>
      </div>

      <div className="mt-3 grid gap-2">
        {visibleAttempts.map((attempt) => (
          <PathProgress
            key={attempt.id}
            enrollment={enrollment}
            attempt={attempt}
          />
        ))}
      </div>

      {attempts.length > visibleAttempts.length ? (
        <p className="mt-2 text-xs text-m3-on-surface-variant">
          {t("dashboard.learning_plan.more_paths", {
            count: attempts.length - visibleAttempts.length,
          })}
        </p>
      ) : null}

      {enrollment.pending_change_request ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t(
            `dashboard.learning_plan.request.${enrollment.pending_change_request.status}`,
          )}
        </div>
      ) : null}

      <Link
        to="/me/learning-programs"
        className="mt-4 inline-flex items-center gap-1 self-start text-sm font-semibold text-m3-primary hover:underline"
      >
        {t("dashboard.learning_plan.view_program")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

export function LearningPlanSection({
  enrollments,
  isLoading,
  isError,
  onRetry,
}: {
  enrollments: LearningProgramEnrollment[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const visible = enrollments.filter(
    (enrollment) =>
      enrollment.status === "active" || enrollment.status === "completed",
  );

  if (!isLoading && !isError && visible.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="learning-plan-heading">
      <SectionHeader
        id="learning-plan-heading"
        title={t("dashboard.learning_plan.title")}
        subtitle={t("dashboard.learning_plan.subtitle")}
        action={
          visible.length > 0 ? (
            <Link
              to="/me/learning-programs"
              className="text-xs font-semibold text-m3-primary hover:underline"
            >
              {t("dashboard.view_all")}
            </Link>
          ) : undefined
        }
      />
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map((item) => (
            <Skeleton key={item} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-m3-on-surface">
                {t("dashboard.learning_plan.load_failed")}
              </p>
              <p className="text-sm text-m3-on-surface-variant">
                {t("dashboard.learning_plan.load_failed_body")}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((enrollment) => (
            <ProgramPlanCard key={enrollment.id} enrollment={enrollment} />
          ))}
        </div>
      )}
    </section>
  );
}

export default ChoosePathPrompt;
