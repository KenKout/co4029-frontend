import { useState } from "react";
import { CheckCircle2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import {
  useMyLearningPrograms,
  useSelectProgramPath,
  useRequestProgramPathChange,
} from "@/lib/api/hooks/learning-programs";
import type { LearningProgramEnrollment } from "@/lib/api/types";

/**
 * Path commitment controls on the public path detail page.
 *
 * Three mutually exclusive situations, driven by the student's program
 * enrolment(s) that offer THIS path:
 *
 * 1. `awaiting_path` — first commitment is still open: show "Choose this
 *    path". Selecting commits immediately (server-side).
 * 2. Enrolled in this path right now (an `active` attempt on it): NO
 *    button — you are already here; leaving happens via another path's
 *    switch flow, not from your own page.
 * 3. Enrolled in the program but on a DIFFERENT path: show "Switch to
 *    this path", but only while the student still has switch budget
 *    (`max_path_switches - approved_switch_count > 0`) and there is no
 *    pending change request already awaiting the Faculty Dean. Switching
 *    is NOT immediate: it opens a dialog stating the decision is
 *    irreversible once approved, collects a written reason, and files a
 *    path-change request for Dean approval.
 */

function findAwaiting(programs: LearningProgramEnrollment[], careerPathId: string) {
  return programs.find(
    (enrollment) =>
      enrollment.status === "awaiting_path" &&
      enrollment.paths.some(
        (path) => path.career_path_id === careerPathId && path.status !== "archived",
      ),
  );
}

function findActiveHere(programs: LearningProgramEnrollment[], careerPathId: string) {
  return programs.find((enrollment) =>
    enrollment.attempts.some(
      (attempt) =>
        attempt.status === "active" && attempt.career_path_id === careerPathId,
    ),
  );
}

function findSwitchableFrom(
  programs: LearningProgramEnrollment[],
  careerPathId: string,
) {
  return programs.find((enrollment) => {
    if (enrollment.status !== "active") return false;
    const activeAttempt = enrollment.attempts.find((a) => a.status === "active");
    // On a different path of the same program that offers this one.
    if (!activeAttempt || activeAttempt.career_path_id === careerPathId)
      return false;
    return enrollment.paths.some(
      (path) => path.career_path_id === careerPathId && path.status !== "archived",
    );
  });
}

export function ChoosePathBanner({ careerPathId }: { careerPathId: string }) {
  const programs = useMyLearningPrograms();
  const selectPath = useSelectProgramPath();
  const requestChange = useRequestProgramPathChange();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");

  const data = programs.data ?? [];
  const awaiting = findAwaiting(data, careerPathId);
  const activeHere = !awaiting ? findActiveHere(data, careerPathId) : undefined;
  const switchable =
    !awaiting && !activeHere ? findSwitchableFrom(data, careerPathId) : undefined;
  if (!awaiting && !activeHere && !switchable) return null;

  async function choose() {
    if (!awaiting) return;
    try {
      await selectPath.mutateAsync({
        enrollmentId: awaiting.id,
        pathId: careerPathId,
      });
      toast.success("Learning path selected");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not select the path",
      );
    }
  }

  async function submitSwitchRequest() {
    if (!switchable || !reason.trim()) return;
    try {
      await requestChange.mutateAsync({
        enrollmentId: switchable.id,
        pathId: careerPathId,
        reason: reason.trim(),
      });
      toast.success(
        "Path change request submitted — waiting for your Faculty Dean's approval",
      );
      setReason("");
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not submit the path change request",
      );
    }
  }

  // ── Case 2: already committed to this exact path — no control ─────────
  // (activeHere) Render nothing; the page itself shows progress.
  if (activeHere) return null;

  // ── Case 1: first-time choice ──────────────────────────────────────────
  if (awaiting) {
    return <AwaitingChoiceBanner enrollment={awaiting} isPending={selectPath.isPending} onChoose={() => void choose()} />;
  }

  return (
    <SwitchRequestSection
      switchable={switchable!}
      dialogOpen={dialogOpen}
      setDialogOpen={setDialogOpen}
      reason={reason}
      setReason={setReason}
      isPending={requestChange.isPending}
      onSubmit={() => void submitSwitchRequest()}
    />
  );
}

function AwaitingChoiceBanner({
  enrollment,
  isPending,
  onChoose,
}: {
  enrollment: LearningProgramEnrollment;
  isPending: boolean;
  onChoose: () => void;
}) {
  const remaining = enrollment.max_path_switches - enrollment.approved_switch_count;
  return (
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-m3-primary/30 bg-m3-primary-fixed/40 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text-strong">
            Choose this path for {enrollment.program_name}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {/* State the cost of the decision up front — the switch budget is
                finite and enforced server-side. */}
            You can change later {remaining} more time
            {remaining === 1 ? "" : "s"}, with approval from your Faculty Dean.
          </p>
        </div>
        <Button className="gap-2" disabled={isPending} onClick={onChoose}>
          <CheckCircle2 className="h-4 w-4" />
          {isPending ? "Selecting…" : "Choose this path"}
        </Button>
      </section>
  );
}

function SwitchRequestSection({
  switchable,
  dialogOpen,
  setDialogOpen,
  reason,
  setReason,
  isPending,
  onSubmit,
}: {
  switchable: LearningProgramEnrollment;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  reason: string;
  setReason: (value: string) => void;
  isPending: boolean;
  onSubmit: () => void;
}) {
  const remaining = switchable.max_path_switches - switchable.approved_switch_count;
  const blockedByPending = Boolean(switchable.pending_change_request);
  const canAsk = remaining > 0 && !blockedByPending;

  return (
    <>
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-m3-primary/30 bg-m3-primary-fixed/40 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text-strong">
            Switch to this path for {switchable.program_name}
          </p>
          {blockedByPending ? (
            <p className="mt-0.5 text-xs text-text-muted">
              You already have a path change request waiting for your Faculty
              Dean&apos;s approval.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-text-muted">
              You can still switch {remaining} more time
              {remaining === 1 ? "" : "s"}, with approval from your Faculty
              Dean.
            </p>
          )}
        </div>
        {canAsk ? (
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <CheckCircle2 className="h-4 w-4" />
            Switch to this path
          </Button>
        ) : null}
      </section>

      <PromptDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setReason("");
        }}
        title={"Request to switch to this path?"}
        description={
          "Submitting this request signs you up for a path change. Once your " +
          "Faculty Dean approves it, the switch is irreversible — your " +
          "progress on the current path will be closed and you will continue " +
          `on this path for ${switchable.program_name}.`
        }
        confirmLabel={
          isPending ? "Submitting…" : "Submit request"
        }
        cancelLabel="Cancel"
        isPending={isPending}
        onConfirm={onSubmit}
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text-strong">
            Reason for switching{" "}
            <span className="text-destructive">*</span>
          </span>
          <textarea
            className="w-full min-h-24 rounded-lg border border-m3-outline-variant/50 bg-white p-3 text-sm outline-none focus:border-m3-primary"
            placeholder="Tell your Faculty Dean why you want to switch…"
            value={reason}
            maxLength={2000}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </PromptDialog>
    </>
  );
}
