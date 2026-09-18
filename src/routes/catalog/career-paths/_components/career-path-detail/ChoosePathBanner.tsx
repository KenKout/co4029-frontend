import { useState } from "react";
import { CheckCircle2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import {
  useMyLearningPrograms,
  useSelectProgramPath,
  useRequestProgramPathChange,
} from "@/lib/api/hooks/learning-programs";
import { getApiErrorMessage, isApiErrorCode } from "@/lib/api/error-codes";
import type { LearningProgramEnrollment } from "@/lib/api/types";

/**
 * Path commitment controls on the public path detail page.
 *
 * Four mutually exclusive situations, driven by the student's program
 * enrolment(s) that offer THIS path:
 *
 * 0. A program has a free slot but the student is at the ORGANIZATION's
 *    ceiling for concurrent paths (`max_concurrent_paths_per_student`):
 *    explain that, and offer nothing. Switching is not the answer here —
 *    the program slot is free, so a switch would spend switch budget to
 *    solve a problem that isn't a program-limit problem.
 * 1. A program still has a selection slot AND the student is under that
 *    ceiling: show "Choose/Add this path". Selecting commits immediately
 *    and does not require Dean approval.
 * 2. Enrolled in this path right now (an `active` attempt on it): NO
 *    button — you are already here; leaving happens via another path's
 *    switch flow, not from your own page.
 * 3. The program is at its OWN path limit (a program that sets none is
 *    never in this state): show "Switch to this path", but
 *    only while the student still has switch budget
 *    (`max_path_switches - approved_switch_count > 0`) and there is no
 *    pending change request already awaiting the Faculty Dean. Switching
 *    is NOT immediate: it opens a dialog stating the decision is
 *    irreversible once approved, collects a written reason, and files a
 *    path-change request for Dean approval.
 */

function findEligiblePrograms(
  programs: LearningProgramEnrollment[],
  careerPathId: string,
) {
  return programs.filter(
    (enrollment) =>
      (enrollment.status === "awaiting_path" ||
        enrollment.status === "active") &&
      enrollment.paths.some(
        (path) =>
          path.career_path_id === careerPathId && path.status !== "archived",
      ) &&
      !enrollment.attempts.some(
        (attempt) =>
          (attempt.status === "active" || attempt.status === "completed") &&
          attempt.career_path_id === careerPathId,
      ),
  );
}

function findActiveHere(
  programs: LearningProgramEnrollment[],
  careerPathId: string,
) {
  return programs.find((enrollment) =>
    enrollment.attempts.some(
      (attempt) =>
        attempt.status === "active" && attempt.career_path_id === careerPathId,
    ),
  );
}

function pathErrorMessage(error: unknown, fallback: string): string {
  if (isApiErrorCode(error, "path_already_active")) {
    return "You are already taking this career path. Finish or drop it before taking it again.";
  }
  return getApiErrorMessage(error, fallback);
}

export function ChoosePathBanner({ careerPathId }: { careerPathId: string }) {
  const programs = useMyLearningPrograms();
  const selectPath = useSelectProgramPath();
  const requestChange = useRequestProgramPathChange();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sourceAttemptId, setSourceAttemptId] = useState("");

  // A failed programs query used to degrade to "no banner" — for a student who
  // already had the page open that reads as a button that does nothing. Surface
  // the failure with a retry instead.
  if (programs.isError) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <div className="min-w-0">
          <p className="font-semibold text-text-strong">
            Couldn&apos;t load your program enrolment
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            Your path choice couldn&apos;t be checked. Retry in a moment.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={programs.isFetching}
          onClick={() => void programs.refetch()}
        >
          {programs.isFetching ? "Retrying…" : "Retry"}
        </Button>
      </section>
    );
  }

  const data = programs.data ?? [];
  const activeHere = findActiveHere(data, careerPathId);
  const eligiblePrograms = activeHere
    ? []
    : findEligiblePrograms(data, careerPathId);
  /**
   * `max_career_paths` is null when the program sets no cap of its own, and
   * a null must read as "room available". Comparing against it directly is
   * the trap: `1 < null` is false in JS, so every uncapped program would look
   * full and the student would be offered a switch — spending switch budget
   * to solve a limit that does not exist.
   */
  const hasRoom = (item: LearningProgramEnrollment) =>
    item.max_career_paths === null ||
    item.selected_path_count < item.max_career_paths;
  const eligible = eligiblePrograms.find(hasRoom) ?? eligiblePrograms[0];
  /**
   * Two independent ceilings, and BOTH have to have room.
   *
   * A program capped at 2 that holds 1 path has a free slot, but the student
   * may already be at the organization's limit for concurrent paths across
   * all their programs — the backend refuses with `student_path_limit_reached`
   * and the button would have promised something it cannot deliver.
   */
  const hasProgramSlot = Boolean(eligible && hasRoom(eligible));
  const atStudentPathLimit = Boolean(
    eligible &&
      eligible.student_active_path_count >=
        eligible.max_concurrent_paths_per_student,
  );
  const canAdd = hasProgramSlot && !atStudentPathLimit;
  const switchable =
    eligible && !hasProgramSlot && eligible.status === "active"
      ? eligible
      : undefined;
  if (activeHere || !eligible) return null;
  // The program still has a slot, so switching is not the right offer — the
  // student has to free a path elsewhere first. Say that rather than showing
  // a switch flow that would consume their switch budget for no reason.
  if (atStudentPathLimit && hasProgramSlot) {
    return (
      <AtPathLimitBanner
        used={eligible.student_active_path_count}
        limit={eligible.max_concurrent_paths_per_student}
      />
    );
  }

  async function choose() {
    if (!eligible || !canAdd) return;
    try {
      await selectPath.mutateAsync({
        enrollmentId: eligible.id,
        pathId: careerPathId,
      });
      toast.success(
        eligible.selected_path_count === 0
          ? "Learning path selected"
          : "Career path added to your program",
      );
    } catch (error) {
      toast.error(pathErrorMessage(error, "Could not select the path"));
    }
  }

  async function submitSwitchRequest() {
    const activeAttempts =
      switchable?.attempts.filter((item) => item.status === "active") ?? [];
    const fromAttemptId =
      sourceAttemptId ||
      (activeAttempts.length === 1 ? activeAttempts[0].id : "");
    if (!switchable || !fromAttemptId || !reason.trim()) return;
    try {
      await requestChange.mutateAsync({
        enrollmentId: switchable.id,
        pathId: careerPathId,
        fromAttemptId,
        reason: reason.trim(),
      });
      toast.success(
        "Path change request submitted — waiting for your Faculty Dean's approval",
      );
      setReason("");
      setSourceAttemptId("");
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        pathErrorMessage(error, "Could not submit the path change request"),
      );
    }
  }

  if (canAdd) {
    return (
      <AwaitingChoiceBanner
        enrollment={eligible}
        isPending={selectPath.isPending}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        onChoose={() => void choose()}
      />
    );
  }

  return (
    <SwitchRequestSection
      switchable={switchable!}
      dialogOpen={dialogOpen}
      setDialogOpen={setDialogOpen}
      reason={reason}
      setReason={setReason}
      sourceAttemptId={sourceAttemptId}
      setSourceAttemptId={setSourceAttemptId}
      isPending={requestChange.isPending}
      onSubmit={() => void submitSwitchRequest()}
    />
  );
}

function AtPathLimitBanner({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100">
        <GraduationCap className="h-5 w-5 text-amber-700" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-text-strong">
          You are already taking {used} career path{used === 1 ? "" : "s"}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          Your organization allows {limit} at a time. Finish or drop one of
          your current paths to take this one.
        </p>
      </div>
    </section>
  );
}

function AwaitingChoiceBanner({
  enrollment,
  isPending,
  dialogOpen,
  setDialogOpen,
  onChoose,
}: {
  enrollment: LearningProgramEnrollment;
  isPending: boolean;
  /** Confirm-dialog visibility — owned by the parent (shared switch dialog
   * state; the two cases never render together). */
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  onChoose: () => void;
}) {
  const remaining =
    enrollment.max_path_switches - enrollment.approved_switch_count;
  return (
    <>
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-m3-primary/30 bg-m3-primary-fixed/40 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text-strong">
            {enrollment.selected_path_count === 0 ? "Choose" : "Add"} this path
            for {enrollment.program_name}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {/* State the cost of the decision up front — the budget is finite
                and enforced server-side. Which budget depends on the program:
                one that sets no cap of its own spends against the
                organization-wide concurrent limit instead, and quoting the
                program's null there would read as "1/". */}
            {enrollment.max_career_paths === null
              ? `${enrollment.student_active_path_count + 1}/${enrollment.max_concurrent_paths_per_student} concurrent paths`
              : `${enrollment.selected_path_count + 1}/${enrollment.max_career_paths} path slots`}{" "}
            will be used. Adding a path does not require approval.
          </p>
        </div>
        <Button
          className="gap-2"
          disabled={isPending}
          onClick={() => setDialogOpen(true)}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isPending
            ? "Saving…"
            : enrollment.selected_path_count === 0
              ? "Choose this path"
              : "Add this path"}
        </Button>
      </section>

      {/* Accidental-click guard: committing a path is a big, hard-to-reverse
          decision, so the button only opens this confirmation. The actual
          commit fires from the dialog's confirm button. */}
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`${enrollment.selected_path_count === 0 ? "Choose" : "Add"} this career path?`}
        description={
          `This path becomes part of ${enrollment.program_name}. ` +
          "The learning program completes only after every selected path is complete. " +
          `Replacing it later uses one of ${remaining} remaining approved path changes.`
        }
        confirmLabel={
          enrollment.selected_path_count === 0 ? "Choose path" : "Add path"
        }
        cancelLabel="Not yet"
        confirmVariant="default"
        isPending={isPending}
        onConfirm={onChoose}
      />
    </>
  );
}

function SwitchRequestSection({
  switchable,
  dialogOpen,
  setDialogOpen,
  reason,
  setReason,
  sourceAttemptId,
  setSourceAttemptId,
  isPending,
  onSubmit,
}: {
  switchable: LearningProgramEnrollment;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  reason: string;
  setReason: (value: string) => void;
  sourceAttemptId: string;
  setSourceAttemptId: (value: string) => void;
  isPending: boolean;
  onSubmit: () => void;
}) {
  const remaining =
    switchable.max_path_switches - switchable.approved_switch_count;
  // Any OPEN request blocks a second one — `pending` and `in_progress` alike.
  // `pending_change_request` already carries both (the backend field name
  // predates the acknowledged status), so a truthiness check is still correct.
  const openRequest = switchable.pending_change_request;
  const blockedByPending = Boolean(openRequest);
  const canAsk = remaining > 0 && !blockedByPending;
  const activeAttempts = switchable.attempts.filter(
    (item) => item.status === "active",
  );

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
              {openRequest?.status === "in_progress"
                ? "Your Faculty Dean is already reviewing a path change request from you."
                : "You already have a path change request waiting for your Faculty Dean's approval."}
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
          if (!open) {
            setReason("");
            setSourceAttemptId("");
          }
        }}
        title={"Request to switch to this path?"}
        description={
          "Submitting this request signs you up for a path change. Once your " +
          "Faculty Dean approves it, the switch is irreversible — your " +
          "progress on the current path will be closed and you will continue " +
          `on this path for ${switchable.program_name}.`
        }
        confirmLabel={isPending ? "Submitting…" : "Submit request"}
        cancelLabel="Cancel"
        isPending={isPending}
        onConfirm={onSubmit}
      >
        {activeAttempts.length > 1 ? (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-strong">
              Path to replace <span className="text-destructive">*</span>
            </span>
            <select
              className="w-full rounded-lg border border-m3-outline-variant/50 bg-white p-3 text-sm outline-none focus:border-m3-primary"
              value={sourceAttemptId}
              onChange={(event) => setSourceAttemptId(event.target.value)}
            >
              <option value="">Select a path</option>
              {activeAttempts.map((attempt) => (
                <option key={attempt.id} value={attempt.id}>
                  {switchable.paths.find(
                    (path) => path.career_path_id === attempt.career_path_id,
                  )?.name ?? attempt.career_path_id}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text-strong">
            Reason for switching <span className="text-destructive">*</span>
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
