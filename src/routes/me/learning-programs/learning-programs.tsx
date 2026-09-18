import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  History,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  useCancelProgramPathChange,
  useMyLearningPrograms,
} from "@/lib/api/hooks/learning-programs";
import type { LearningProgramEnrollment } from "@/lib/api/types";
import { useFormatDateTimeMedium } from "@/lib/format/date";
import {
  ChangeRequestHistory,
  OpenChangeRequestBanner,
} from "./_components/ChangeRequestHistory";
import { DropPathRequest } from "./_components/DropPathRequest";
import { PathCard } from "./_components/PathCard";

function SelectedPaths({
  enrollment,
  attempts,
}: {
  enrollment: LearningProgramEnrollment;
  attempts: LearningProgramEnrollment["attempts"];
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-m3-primary">
        {t("my_learning_programs.selected_paths")}
      </p>
      {attempts.map((attempt) => {
        const path = enrollment.paths.find(
          (item) => item.career_path_id === attempt.career_path_id,
        );
        if (!path) return null;
        return (
          <div
            key={attempt.id}
            className="rounded-xl bg-m3-primary-container/40 p-4 space-y-3"
          >
            <Link
              to="/catalog/career-paths/$slug"
              params={{ slug: path.slug }}
              search={{ enrollment: enrollment.id }}
              className="flex items-center justify-between hover:opacity-80"
            >
              <div>
                <p className="font-semibold text-m3-on-surface">{path.name}</p>
                {attempt.status === "completed" ? (
                  <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                    {t("my_learning_programs.path_completed")}
                  </p>
                ) : null}
              </div>
              <ArrowRight className="h-5 w-5 text-m3-primary" />
            </Link>
            <div>
              <div className="mb-1 flex justify-between text-xs text-m3-on-surface-variant">
                <span>
                  {t("my_learning_programs.course_progress", {
                    completed: attempt.completed_courses,
                    total: attempt.total_courses,
                  })}
                </span>
                <span>{attempt.progress_percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-card/70">
                <div
                  className="h-full rounded-full bg-m3-primary"
                  style={{ width: `${attempt.progress_percent}%` }}
                />
              </div>
            </div>
            {/* Only on a path still being studied: a completed path is a
                result, not a commitment to walk back. */}
            {attempt.status === "active" ? (
              <div className="flex justify-end">
                <DropPathRequest
                  enrollment={enrollment}
                  attemptId={attempt.id}
                  pathName={path.name}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

function TransitionHistory({
  enrollment,
}: {
  enrollment: LearningProgramEnrollment;
}) {
  const { t } = useTranslation();
  const formatDateTime = useFormatDateTimeMedium();
  const attempts = enrollment.attempts.filter(
    (attempt) =>
      attempt.status === "switched_out" || attempt.status === "cancelled",
  );
  if (attempts.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4" />{" "}
        {t("my_learning_programs.transition_history")}
      </p>
      {attempts.map((attempt) => {
        const path = enrollment.paths.find(
          (item) => item.career_path_id === attempt.career_path_id,
        );
        const percent = attempt.exit_snapshot?.overall_percent;
        const details = [
          t("my_learning_programs.switched_away"),
          typeof percent === "number"
            ? t("my_learning_programs.percent_done", {
                percent: Math.round(percent),
              })
            : null,
          t("my_learning_programs.transition_started_at", {
            value: formatDateTime(attempt.selected_at),
          }),
          attempt.ended_at
            ? t("my_learning_programs.transition_ended_at", {
                value: formatDateTime(attempt.ended_at),
              })
            : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <div
            key={attempt.id}
            className="flex justify-between rounded-lg bg-m3-surface-container px-3 py-2 text-sm"
          >
            <span>{path?.name ?? attempt.career_path_id}</span>
            <span className="text-m3-on-surface-variant">{details}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProgramCard({
  enrollment,
}: {
  enrollment: LearningProgramEnrollment;
}) {
  const { t } = useTranslation();
  const cancelChange = useCancelProgramPathChange();
  const selectedAttempts = enrollment.attempts.filter(
    (attempt) => attempt.status === "active" || attempt.status === "completed",
  );
  const selectedIds = new Set(
    selectedAttempts.map((attempt) => attempt.career_path_id),
  );
  const available = enrollment.paths.filter(
    (path) =>
      path.status !== "archived" && !selectedIds.has(path.career_path_id),
  );

  return (
    <article className="rounded-2xl bg-card ghost-border p-5 space-y-5">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-headline font-bold text-lg text-m3-on-surface">
              {enrollment.program_name}
            </h2>
            <span className="rounded-full bg-m3-surface-container px-2.5 py-1 text-xs font-semibold">
              {t(`my_learning_programs.status.${enrollment.status}`)}
            </span>
          </div>
          <p className="mt-1 text-sm text-m3-on-surface-variant">
            {/* `max_career_paths` is null when this program sets no limit of
                its own, and "{selected}/{null}" renders as "1/". The student
                is bounded by their student-wide budget instead, which is
                stated once above the cards rather than repeated here. */}
            {t(
              enrollment.max_career_paths === null
                ? "my_learning_programs.program_summary_uncapped"
                : "my_learning_programs.program_summary",
              {
                version: enrollment.program_version_no,
                selected: enrollment.selected_path_count,
                pathMax: enrollment.max_career_paths,
                used: enrollment.approved_switch_count,
                max: enrollment.max_path_switches,
              },
            )}
          </p>
        </div>
      </div>

      {selectedAttempts.length > 0 ? (
        <SelectedPaths enrollment={enrollment} attempts={selectedAttempts} />
      ) : null}

      {enrollment.status === "completed" && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />{" "}
          {t("my_learning_programs.completed_message")}
        </div>
      )}

      {enrollment.status === "awaiting_path" && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-m3-on-surface">
              {t("my_learning_programs.choose_path.title")}
            </p>
            <p className="mt-0.5 text-xs text-m3-on-surface-variant">
              {t("my_learning_programs.choose_path.description")}
            </p>
          </div>
          {/* Cards rather than a <select>: this is a comparison, and a
              dropdown shows one option at a time with no attributes at all.
              The commit lives on the path detail, behind the roadmap. */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {enrollment.paths
              .filter((path) => path.status !== "archived")
              .map((path) => (
                <PathCard
                  key={path.career_path_id}
                  path={path}
                  isCurrent={false}
                  programEnrollmentId={enrollment.id}
                />
              ))}
          </div>
        </div>
      )}

      {enrollment.status === "active" &&
        available.length > 0 &&
        (enrollment.pending_change_request ? (
          <OpenChangeRequestBanner
            request={enrollment.pending_change_request}
            isCancelling={cancelChange.isPending}
            onCancel={() =>
              void cancelChange.mutateAsync(
                enrollment.pending_change_request!.id,
              )
            }
          />
        ) : (
          /* Switching is a considered decision, not an inline form: send the
             student to browse the path cards; the commit lives on each path
             detail behind its roadmap and a confirmation dialog. */
          <Link
            to="/catalog/career-paths"
            search={{ enrollment: enrollment.id }}
            className="flex items-center justify-between rounded-xl border border-m3-outline-variant p-4 hover:bg-m3-surface-container"
          >
            <div>
              <p className="text-sm font-semibold text-m3-on-surface">
                {t("my_learning_programs.explore_paths.title")}
              </p>
              <p className="mt-0.5 text-xs text-m3-on-surface-variant">
                {t("my_learning_programs.explore_paths.description")}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-m3-primary" />
          </Link>
        ))}

      {/* Decided requests — including rejections with the dean's reason.
          Rendered regardless of enrolment status: a student whose program has
          since completed should still be able to read why a past request was
          refused. */}
      <ChangeRequestHistory history={enrollment.change_request_history ?? []} />

      <TransitionHistory enrollment={enrollment} />
    </article>
  );
}

function StudentPathBudget({
  enrollment,
}: {
  enrollment: LearningProgramEnrollment;
}) {
  const { t } = useTranslation();
  const used = enrollment.student_active_path_count;
  const limit = enrollment.max_concurrent_paths_per_student;
  const atLimit = used >= limit;
  return (
    <section
      className={`rounded-xl border p-4 ${
        atLimit
          ? "border-amber-300 bg-amber-50"
          : "border-m3-outline-variant/40 bg-card"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-m3-on-surface-variant">
        {t("my_learning_programs.path_budget.label")}
      </p>
      <p className="mt-0.5 font-semibold text-m3-on-surface">
        {t("my_learning_programs.path_budget.value", { used, limit })}
      </p>
      {atLimit ? (
        <p className="mt-1 text-xs text-amber-800">
          {t("my_learning_programs.path_budget.at_limit")}
        </p>
      ) : null}
    </section>
  );
}

export default function LearningProgramsPage() {
  const { t } = useTranslation();
  const programs = useMyLearningPrograms();
  if (programs.isLoading) return <PageSkeleton rows={3} />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <PageHeader
        title={t("my_learning_programs.title")}
        subtitle={t("my_learning_programs.subtitle")}
      />
      {programs.data?.length ? (
        <div className="space-y-4">
          {/* Any enrollment carries the student-wide totals; they are the
              same on all of them. */}
          <StudentPathBudget enrollment={programs.data[0]} />
          {programs.data.map((item) => (
            <ProgramCard key={item.id} enrollment={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title={t("my_learning_programs.empty.title")}
          description={t("my_learning_programs.empty.description")}
        />
      )}
    </div>
  );
}
