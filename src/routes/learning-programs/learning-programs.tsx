import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  useCancelProgramPathChange,
  useMyLearningPrograms,
} from "@/lib/api/hooks/learning-programs";
import type { LearningProgramEnrollment } from "@/lib/api/types";
import { useFormatDate } from "@/lib/format/date";
import { PathCard } from "./_components/PathCard";

function ProgramCard({ enrollment }: { enrollment: LearningProgramEnrollment }) {
  const cancelChange = useCancelProgramPathChange();
  const formatDate = useFormatDate();
  const active = enrollment.attempts.find((attempt) => attempt.status === "active");
  const currentPath = enrollment.paths.find((path) => path.career_path_id === active?.career_path_id);
  const available = enrollment.paths.filter(
    (path) => path.status !== "archived" && path.career_path_id !== active?.career_path_id,
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
              {enrollment.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-sm text-m3-on-surface-variant">
            Program version {enrollment.program_version_no} · {enrollment.approved_switch_count}/
            {enrollment.max_path_switches} path changes used
          </p>
        </div>
      </div>

      {currentPath && (
        <div className="rounded-xl bg-m3-primary-container/40 p-4 space-y-3">
          <Link
            to="/career-paths/$slug"
            params={{ slug: currentPath.slug }}
            className="flex items-center justify-between hover:opacity-80"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-m3-primary">Current path</p>
              <p className="mt-1 font-semibold text-m3-on-surface">{currentPath.name}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-m3-primary" />
          </Link>
          <div>
            <div className="mb-1 flex justify-between text-xs text-m3-on-surface-variant">
              <span>{enrollment.current_completed_courses}/{enrollment.current_total_courses} courses</span>
              <span>{enrollment.current_progress_percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-card/70">
              <div
                className="h-full rounded-full bg-m3-primary"
                style={{ width: `${enrollment.current_progress_percent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {enrollment.status === "completed" && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-5 w-5" /> Program completed. Path changes are closed.
        </div>
      )}

      {enrollment.status === "awaiting_path" && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-m3-on-surface">Choose one career path</p>
            <p className="mt-0.5 text-xs text-m3-on-surface-variant">
              Open a path to see its full roadmap before you commit — changing
              later needs approval from your Faculty Dean.
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
                />
              ))}
          </div>
        </div>
      )}

      {enrollment.status === "active" && available.length > 0 && (
        enrollment.pending_change_request ? (
          <div className="flex items-center justify-between rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <div>
              <p className="font-semibold">Waiting for Faculty Dean review</p>
              <p className="mt-1">{enrollment.pending_change_request.reason}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={cancelChange.isPending}
              onClick={() =>
                void cancelChange.mutateAsync(enrollment.pending_change_request!.id)
              }
            >
              Cancel request
            </Button>
          </div>
        ) : (
          /* Switching is a considered decision, not an inline form: send the
             student to browse the path cards; the commit lives on each path
             detail behind its roadmap and a confirmation dialog. */
          <Link
            to="/career-paths"
            className="flex items-center justify-between rounded-xl border border-m3-outline-variant p-4 hover:bg-m3-surface-container"
          >
            <div>
              <p className="text-sm font-semibold text-m3-on-surface">Explore other paths</p>
              <p className="mt-0.5 text-xs text-m3-on-surface-variant">
                Browse all career paths — switching later needs approval from your Faculty Dean.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-m3-primary" />
          </Link>
        )
      )}

      {enrollment.attempts.length > 1 && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4" /> Transition history
          </p>
          {enrollment.attempts
            .filter((attempt) => attempt.status !== "active")
            .map((attempt) => {
              const path = enrollment.paths.find((item) => item.career_path_id === attempt.career_path_id);
              const percent = attempt.exit_snapshot?.overall_percent;
              return (
                <div key={attempt.id} className="flex justify-between rounded-lg bg-m3-surface-container px-3 py-2 text-sm">
                  <span>{path?.name ?? attempt.career_path_id}</span>
                  <span className="text-m3-on-surface-variant">
                    Switched away{typeof percent === "number" ? ` · ${Math.round(percent)}% done` : ""}
                    {attempt.ended_at ? ` · ${formatDate(attempt.ended_at)}` : ""}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </article>
  );
}

export default function LearningProgramsPage() {
  const programs = useMyLearningPrograms();
  if (programs.isLoading) return <PageSkeleton rows={3} />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <PageHeader title="My Learning Programs" subtitle="Choose and follow one career path in each enrolled program." />
      {programs.data?.length ? (
        <div className="space-y-4">{programs.data.map((item) => <ProgramCard key={item.id} enrollment={item} />)}</div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No learning program yet"
          description="A Manager or Faculty Dean must enroll you before you can choose a career path."
        />
      )}
    </div>
  );
}
