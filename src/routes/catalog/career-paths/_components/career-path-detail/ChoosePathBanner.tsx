import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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

function pathErrorMessage(
  error: unknown,
  fallback: string,
  alreadyActive: string,
): string {
  if (isApiErrorCode(error, "path_already_active")) {
    return alreadyActive;
  }
  return getApiErrorMessage(error, fallback);
}

function hasProgramRoom(program: LearningProgramEnrollment) {
  return (
    program.max_career_paths === null ||
    program.selected_path_count < program.max_career_paths
  );
}

function resolvePathChoice(
  programs: LearningProgramEnrollment[],
  careerPathId: string,
) {
  const activeHere = findActiveHere(programs, careerPathId);
  const eligiblePrograms = activeHere
    ? []
    : findEligiblePrograms(programs, careerPathId);
  const eligible = eligiblePrograms.find(hasProgramRoom) ?? eligiblePrograms[0];
  const hasProgramSlot = Boolean(eligible && hasProgramRoom(eligible));
  const atStudentPathLimit = Boolean(
    eligible &&
      eligible.student_active_path_count >=
        eligible.max_concurrent_paths_per_student,
  );
  return {
    activeHere,
    eligiblePrograms,
    eligible,
    hasProgramSlot,
    atStudentPathLimit,
    canAdd: hasProgramSlot && !atStudentPathLimit,
    switchable:
      eligible && !hasProgramSlot && eligible.status === "active"
        ? eligible
        : undefined,
  };
}

function ProgramLoadError({
  isFetching,
  retry,
}: {
  isFetching: boolean;
  retry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <div className="min-w-0">
        <p className="font-semibold text-text-strong">
          {t("career_path_detail.choice.load_failed_title")}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          {t("career_path_detail.choice.load_failed_body")}
        </p>
      </div>
      <Button variant="outline" disabled={isFetching} onClick={retry}>
        {isFetching
          ? t("career_path_detail.choice.retrying")
          : t("career_path_detail.choice.retry")}
      </Button>
    </section>
  );
}

export function ChoosePathBanner({
  careerPathId,
  careerPathSlug,
  programEnrollmentId,
}: {
  careerPathId: string;
  careerPathSlug: string;
  programEnrollmentId?: string;
}) {
  const { t } = useTranslation();
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
      <ProgramLoadError
        isFetching={programs.isFetching}
        retry={() => void programs.refetch()}
      />
    );
  }

  const data = programEnrollmentId
    ? (programs.data ?? []).filter((item) => item.id === programEnrollmentId)
    : (programs.data ?? []);
  const {
    activeHere,
    eligiblePrograms,
    eligible,
    hasProgramSlot,
    atStudentPathLimit,
    canAdd,
    switchable,
  } = resolvePathChoice(data, careerPathId);
  if (!programEnrollmentId && !activeHere && eligiblePrograms.length > 1) {
    return (
      <ProgramPickerBanner
        programs={eligiblePrograms}
        careerPathSlug={careerPathSlug}
      />
    );
  }
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
        t(
          eligible.selected_path_count === 0
            ? "career_path_detail.choice.selected"
            : "career_path_detail.choice.added",
        ),
      );
    } catch (error) {
      toast.error(
        pathErrorMessage(
          error,
          t("career_path_detail.choice.select_failed"),
          t("career_path_detail.choice.already_active"),
        ),
      );
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
      toast.success(t("career_path_detail.choice.switch_submitted"));
      setReason("");
      setSourceAttemptId("");
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        pathErrorMessage(
          error,
          t("career_path_detail.choice.switch_failed"),
          t("career_path_detail.choice.already_active"),
        ),
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

function ProgramPickerBanner({
  programs,
  careerPathSlug,
}: {
  programs: LearningProgramEnrollment[];
  careerPathSlug: string;
}) {
  const { t } = useTranslation();
  return (
    <section className="rounded-2xl border border-m3-primary/30 bg-m3-primary-fixed/40 p-5">
      <p className="font-semibold text-text-strong">
        {t("career_path_detail.choice.choose_program_title")}
      </p>
      <p className="mt-1 text-xs text-text-muted">
        {t("career_path_detail.choice.choose_program_body")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {programs.map((program) => (
          <Link
            key={program.id}
            to="/catalog/career-paths/$slug"
            params={{ slug: careerPathSlug }}
            search={{ enrollment: program.id }}
          >
            <Button variant="outline">{program.program_name}</Button>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AtPathLimitBanner({ used, limit }: { used: number; limit: number }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100">
        <GraduationCap className="h-5 w-5 text-amber-700" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-text-strong">
          {t("career_path_detail.choice.student_limit_title", { count: used })}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          {t("career_path_detail.choice.student_limit_body", { limit })}
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
  const { t } = useTranslation();
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
            {t(
              enrollment.selected_path_count === 0
                ? "career_path_detail.choice.choose_for_program"
                : "career_path_detail.choice.add_for_program",
              { program: enrollment.program_name },
            )}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {/* State the cost of the decision up front — the budget is finite
                and enforced server-side. Which budget depends on the program:
                one that sets no cap of its own spends against the
                organization-wide concurrent limit instead, and quoting the
                program's null there would read as "1/". */}
            {enrollment.max_career_paths === null
              ? t("career_path_detail.choice.concurrent_slot_cost", {
                  used: enrollment.student_active_path_count + 1,
                  limit: enrollment.max_concurrent_paths_per_student,
                })
              : t("career_path_detail.choice.program_slot_cost", {
                  used: enrollment.selected_path_count + 1,
                  limit: enrollment.max_career_paths,
                })}{" "}
            {t("career_path_detail.choice.no_approval_needed")}
          </p>
        </div>
        <Button
          className="gap-2"
          disabled={isPending}
          onClick={() => setDialogOpen(true)}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isPending
            ? t("career_path_detail.choice.saving")
            : enrollment.selected_path_count === 0
              ? t("career_path_detail.choice.choose_this_path")
              : t("career_path_detail.choice.add_this_path")}
        </Button>
      </section>

      {/* Accidental-click guard: committing a path is a big, hard-to-reverse
          decision, so the button only opens this confirmation. The actual
          commit fires from the dialog's confirm button. */}
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={t(
          enrollment.selected_path_count === 0
            ? "career_path_detail.choice.confirm_choose_title"
            : "career_path_detail.choice.confirm_add_title",
        )}
        description={t("career_path_detail.choice.confirm_description", {
          program: enrollment.program_name,
          remaining,
        })}
        confirmLabel={
          enrollment.selected_path_count === 0
            ? t("career_path_detail.choice.choose_path")
            : t("career_path_detail.choice.add_path")
        }
        cancelLabel={t("career_path_detail.choice.not_yet")}
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
  const { t } = useTranslation();
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
            {t("career_path_detail.choice.switch_for_program", {
              program: switchable.program_name,
            })}
          </p>
          {blockedByPending ? (
            <p className="mt-0.5 text-xs text-text-muted">
              {openRequest?.status === "in_progress"
                ? t("career_path_detail.choice.request_in_review")
                : t("career_path_detail.choice.request_pending")}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-text-muted">
              {t("career_path_detail.choice.switches_remaining", {
                count: remaining,
              })}
            </p>
          )}
        </div>
        {canAsk ? (
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <CheckCircle2 className="h-4 w-4" />
            {t("career_path_detail.choice.switch_to_path")}
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
        title={t("career_path_detail.choice.switch_dialog_title")}
        description={t("career_path_detail.choice.switch_dialog_description", {
          program: switchable.program_name,
        })}
        confirmLabel={
          isPending
            ? t("career_path_detail.choice.submitting")
            : t("career_path_detail.choice.submit_request")
        }
        cancelLabel={t("career_path_detail.choice.cancel")}
        isPending={isPending}
        onConfirm={onSubmit}
      >
        {activeAttempts.length > 1 ? (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-strong">
              {t("career_path_detail.choice.path_to_replace")}{" "}
              <span className="text-destructive">*</span>
            </span>
            <select
              className="w-full rounded-lg border border-m3-outline-variant/50 bg-white p-3 text-sm outline-none focus:border-m3-primary"
              value={sourceAttemptId}
              onChange={(event) => setSourceAttemptId(event.target.value)}
            >
              <option value="">
                {t("career_path_detail.choice.select_path")}
              </option>
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
            {t("career_path_detail.choice.switch_reason")}{" "}
            <span className="text-destructive">*</span>
          </span>
          <textarea
            className="w-full min-h-24 rounded-lg border border-m3-outline-variant/50 bg-white p-3 text-sm outline-none focus:border-m3-primary"
            placeholder={t(
              "career_path_detail.choice.switch_reason_placeholder",
            )}
            value={reason}
            maxLength={2000}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </PromptDialog>
    </>
  );
}
