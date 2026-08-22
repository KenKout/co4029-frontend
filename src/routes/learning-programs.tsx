import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useCancelProgramPathChange,
  useMyLearningPrograms,
  useRequestProgramPathChange,
  useSelectProgramPath,
} from "@/lib/api/hooks/learning-programs";
import type { LearningProgramEnrollment } from "@/lib/api/types";

function ProgramCard({ enrollment }: { enrollment: LearningProgramEnrollment }) {
  const selectPath = useSelectProgramPath();
  const requestChange = useRequestProgramPathChange();
  const cancelChange = useCancelProgramPathChange();
  const active = enrollment.attempts.find((attempt) => attempt.status === "active");
  const currentPath = enrollment.paths.find((path) => path.career_path_id === active?.career_path_id);
  const [targetPath, setTargetPath] = useState("");
  const [reason, setReason] = useState("");
  const available = enrollment.paths.filter(
    (path) => path.status !== "archived" && path.career_path_id !== active?.career_path_id,
  );

  async function chooseInitialPath() {
    if (!targetPath) return;
    try {
      await selectPath.mutateAsync({ enrollmentId: enrollment.id, pathId: targetPath });
      toast.success("Learning path selected");
      setTargetPath("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not select the path");
    }
  }

  async function submitChange() {
    if (!targetPath || !reason.trim()) return;
    try {
      await requestChange.mutateAsync({
        enrollmentId: enrollment.id,
        pathId: targetPath,
        reason: reason.trim(),
      });
      toast.success("Your request was sent to the Faculty Dean");
      setTargetPath("");
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request the change");
    }
  }

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
          <p className="text-sm font-semibold text-m3-on-surface">Choose one career path</p>
          <select
            value={targetPath}
            onChange={(event) => setTargetPath(event.target.value)}
            className="w-full rounded-lg border border-m3-outline-variant bg-card px-3 py-2 text-sm"
          >
            <option value="">Select a path…</option>
            {available.map((path) => (
              <option key={path.career_path_id} value={path.career_path_id}>
                {path.name}
              </option>
            ))}
          </select>
          <Button onClick={() => void chooseInitialPath()} disabled={!targetPath || selectPath.isPending}>
            Confirm path
          </Button>
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
        <details className="rounded-xl border border-m3-outline-variant p-4">
          <summary className="cursor-pointer text-sm font-semibold text-m3-on-surface">
            Request a path change
          </summary>
          <div className="mt-4 space-y-3">
            <select
              value={targetPath}
              onChange={(event) => setTargetPath(event.target.value)}
              className="w-full rounded-lg border border-m3-outline-variant bg-card px-3 py-2 text-sm"
            >
              <option value="">Target path…</option>
              {available.map((path) => (
                <option key={path.career_path_id} value={path.career_path_id}>
                  {path.name}
                </option>
              ))}
            </select>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why do you want to change paths?"
            />
            <Button
              onClick={() => void submitChange()}
              disabled={!targetPath || !reason.trim() || requestChange.isPending}
            >
              Send to Faculty Dean
            </Button>
          </div>
        </details>
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
                    {attempt.status}{typeof percent === "number" ? ` · ${percent}%` : ""}
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
