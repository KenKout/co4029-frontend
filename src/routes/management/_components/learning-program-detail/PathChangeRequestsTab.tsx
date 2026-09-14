import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api/error-codes";
import {
  useDecidePathChange,
  useMarkPathChangeInProgress,
} from "@/lib/api/hooks/learning-programs";
import type {
  LearningProgramEnrollment,
  PathChangeRequest,
} from "@/lib/api/types";
import { PathChangeRequestsSection } from "./PathChangeRequests";

/**
 * The dean's review tab: the open-request list plus the three review actions
 * wired to their mutations.
 *
 * The handlers live here rather than on the program detail page because each
 * one has real behaviour attached (a confirmation, a toast, an error path that
 * must keep a dialog open), and the page was already the largest file in the
 * route. Nothing here needs the page's version/roster editing state.
 *
 * Toast wording names the side effect the dean cannot see — "the student has
 * been notified" — because every one of these actions sends a notification and
 * a silent success looks identical to a no-op.
 */
export function PathChangeRequestsTab({
  programId,
  requests,
  roster,
}: {
  programId: string;
  /** OPEN requests only (`pending` + `in_progress`). */
  requests: PathChangeRequest[];
  roster: LearningProgramEnrollment[];
}) {
  const { t } = useTranslation();
  const decide = useDecidePathChange(programId);
  const markInProgress = useMarkPathChangeInProgress(programId);
  const [approveTarget, setApproveTarget] = useState<PathChangeRequest | null>(
    null,
  );
  const [approveNote, setApproveNote] = useState("");

  function closeApproveDialog() {
    if (decide.isPending) return;
    setApproveTarget(null);
    setApproveNote("");
  }

  async function approveRequest() {
    if (!approveTarget || decide.isPending) return;
    try {
      await decide.mutateAsync({
        requestId: approveTarget.id,
        approve: true,
        note: approveNote.trim() || undefined,
      });
      toast.success(t("management_learning_program_detail.toast.approved"));
      setApproveTarget(null);
      setApproveNote("");
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("management_learning_program_detail.toast.approve_failed"),
        ),
      );
    }
  }

  return (
    <section className="space-y-4 rounded-xl bg-card p-5 ghost-border">
      <div>
        <h2 className="font-headline text-lg font-bold">
          {t("management_learning_program_detail.requests.title")}
        </h2>
        <p className="mt-0.5 text-sm text-m3-on-surface-variant">
          {t("management_learning_program_detail.requests.description")}
        </p>
      </div>
      <PathChangeRequestsSection
        requests={requests}
        roster={roster}
        markingInProgressId={
          markInProgress.isPending ? markInProgress.variables ?? null : null
        }
        onMarkInProgress={(request) =>
          void markInProgress
            .mutateAsync(request.id)
            .then(() =>
              toast.success(t("management_learning_program_detail.toast.in_progress")),
            )
            .catch((error: unknown) =>
              toast.error(getApiErrorMessage(error, t("management_learning_program_detail.toast.in_progress_failed"))),
            )
        }
        onApprove={setApproveTarget}
        isRejecting={decide.isPending}
        onReject={(request, reasonCode, reason, note) =>
          decide
            .mutateAsync({
              requestId: request.id,
              approve: false,
              reasonCode,
              reason: reason || undefined,
              note: note || undefined,
            })
            .then(() =>
              toast.success(t("management_learning_program_detail.toast.rejected")),
            )
            .catch((error: unknown) => {
              toast.error(getApiErrorMessage(error, t("management_learning_program_detail.toast.reject_failed")));
              // Rethrow so the dialog stays open on failure: closing it would
              // discard the reason the dean just typed.
              throw error;
            })
        }
      />

      <ConfirmDialog
        open={approveTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeApproveDialog();
        }}
        title={t("management_learning_program_detail.confirm.approve_title")}
        description={t(
          "management_learning_program_detail.confirm.approve_description",
        )}
        confirmLabel={
          decide.isPending
            ? t("management_learning_program_detail.actions.approving")
            : t("management_learning_program_detail.actions.approve")
        }
        cancelLabel={t("management_learning_program_detail.actions.cancel")}
        confirmVariant="default"
        isPending={decide.isPending}
        onConfirm={() => void approveRequest()}
        extraContent={
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-strong">
              {t("management_learning_program_detail.approve.note")}{" "}
              <span className="font-normal text-text-muted">
                {t("management_learning_program_detail.reject.optional")}
              </span>
            </span>
            <Textarea
              variant="low"
              rows={3}
              maxLength={2000}
              value={approveNote}
              disabled={decide.isPending}
              placeholder={t(
                "management_learning_program_detail.approve.note_placeholder",
              )}
              onChange={(event) => setApproveNote(event.target.value)}
            />
          </label>
        }
      />
    </section>
  );
}
