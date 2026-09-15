import { useState } from "react";
import { MinusCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { useRequestProgramPathDrop } from "@/lib/api/hooks/learning-programs";
import { getApiErrorMessage } from "@/lib/api/error-codes";
import type { LearningProgramEnrollment } from "@/lib/api/types";

/**
 * "Drop this path" on one selected path.
 *
 * Adding a path is unilateral; removing one is not. A drop goes to the same
 * Faculty Dean queue as a switch, spends one of the same finite path changes,
 * and is never refunded — so the dialog states that cost before the student
 * commits, exactly as the switch flow does.
 *
 * The button is hidden, not disabled, when a drop is impossible, because each
 * reason is a different sentence and a lone greyed-out control explains none
 * of them. The two conditions worth naming are surfaced instead:
 *
 * * **Only one active path.** Dropping it would leave the student enrolled in
 *   a program with no path, which is leaving the program — a withdrawal, and
 *   an operator's action. The server refuses it either way
 *   (`at_least_one_path_must_remain`); this just avoids offering it.
 * * **A request is already open.** One open request per enrolment, `pending`
 *   and `in_progress` alike.
 */
export function DropPathRequest({
  enrollment,
  attemptId,
  pathName,
}: {
  enrollment: LearningProgramEnrollment;
  attemptId: string;
  pathName: string;
}) {
  const { t } = useTranslation();
  const requestDrop = useRequestProgramPathDrop();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const activeCount = enrollment.attempts.filter(
    (attempt) => attempt.status === "active",
  ).length;
  const remaining =
    enrollment.max_path_switches - enrollment.approved_switch_count;
  const canDrop =
    enrollment.status === "active" &&
    activeCount > 1 &&
    remaining > 0 &&
    !enrollment.pending_change_request;

  if (!canDrop) return null;

  async function submit() {
    if (!reason.trim()) return;
    try {
      await requestDrop.mutateAsync({
        enrollmentId: enrollment.id,
        fromAttemptId: attemptId,
        reason: reason.trim(),
      });
      toast.success(t("my_learning_programs.drop_path.submitted"));
      setReason("");
      setOpen(false);
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, t("my_learning_programs.drop_path.failed")),
      );
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <MinusCircle className="h-3.5 w-3.5" />
        {t("my_learning_programs.drop_path.action")}
      </Button>

      <PromptDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setReason("");
        }}
        title={t("my_learning_programs.drop_path.title", { path: pathName })}
        description={t("my_learning_programs.drop_path.description", {
          path: pathName,
          count: remaining,
        })}
        confirmLabel={
          requestDrop.isPending
            ? t("my_learning_programs.drop_path.submitting")
            : t("my_learning_programs.drop_path.confirm")
        }
        cancelLabel={t("common.cancel")}
        isPending={requestDrop.isPending}
        onConfirm={() => void submit()}
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text-strong">
            {t("my_learning_programs.drop_path.reason_label")}{" "}
            <span className="text-destructive">*</span>
          </span>
          <textarea
            className="w-full min-h-24 rounded-lg border border-m3-outline-variant/50 bg-white p-3 text-sm outline-none focus:border-m3-primary"
            placeholder={t("my_learning_programs.drop_path.reason_placeholder")}
            value={reason}
            maxLength={2000}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </PromptDialog>
    </>
  );
}
