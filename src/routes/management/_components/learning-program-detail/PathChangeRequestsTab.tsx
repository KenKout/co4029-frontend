import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
  onApprove,
}: {
  programId: string;
  /** OPEN requests only (`pending` + `in_progress`). */
  requests: PathChangeRequest[];
  roster: LearningProgramEnrollment[];
  /** Approval routes back through the page's shared confirm dialog. */
  onApprove: (request: PathChangeRequest) => void;
}) {
  const { t } = useTranslation();
  const decide = useDecidePathChange(programId);
  const markInProgress = useMarkPathChangeInProgress(programId);

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
        onApprove={onApprove}
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
    </section>
  );
}
