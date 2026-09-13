import { CheckCircle2, Clock, Eye, History, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  PathChangeRejectionReasonCode,
  PathChangeRequest,
} from "@/lib/api/types";

/**
 * The student's own view of their path-change requests.
 *
 * Two problems this fixes. First, an open request rendered a single flat
 * "Waiting for Faculty Dean review" from submission to decision, so a student
 * could not tell an untouched request from one being actively checked — and
 * silence over several days reads as "nobody is looking at this". `in_progress`
 * now says so explicitly.
 *
 * Second, a decided request disappeared from the student's view entirely: a
 * rejection produced no trace they could re-read, which is exactly the case
 * where the reason matters most. The history keeps every request with its
 * outcome, and rejections show the dean's reason and any note.
 */

/** Student-facing wording for each rejection code. The dean picks a code; this
 *  is the sentence the student reads, matching the notification copy. */
const REJECTION_REASON_KEYS: Record<PathChangeRejectionReasonCode, string> = {
  insufficient_justification: "insufficient_justification",
  progress_loss_too_high: "progress_loss_too_high",
  target_path_not_suitable: "target_path_not_suitable",
  preserve_remaining_switch: "preserve_remaining_switch",
  advising_required: "advising_required",
  documentation_missing: "documentation_missing",
  other: "other",
};

/** Open-request banner: acknowledges receipt, and says whether it has been
 *  picked up yet. Also the only place the student can withdraw the request. */
export function OpenChangeRequestBanner({
  request,
  isCancelling,
  onCancel,
}: {
  request: PathChangeRequest;
  isCancelling: boolean;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const inProgress = request.status === "in_progress";
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 text-sm",
        inProgress ? "bg-m3-primary-container/50 text-m3-on-surface" : "bg-amber-50 text-amber-900",
      )}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-semibold">
          {inProgress ? (
            <>
              <Eye className="h-4 w-4" /> {t("my_learning_programs.requests.reviewing")}
            </>
          ) : (
            <>
              <Clock className="h-4 w-4" /> {t("my_learning_programs.requests.waiting")}
            </>
          )}
        </p>
        <p className="mt-1">
          {inProgress
            ? t("my_learning_programs.requests.reviewing_description")
            : t("my_learning_programs.requests.waiting_description")}
        </p>
        <p className="mt-1 text-xs opacity-80">{t("my_learning_programs.requests.your_reason", { reason: request.reason })}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={isCancelling}
        onClick={onCancel}
      >
        {t("my_learning_programs.requests.cancel")}
      </Button>
    </div>
  );
}

function DecidedRequestRow({
  request,
  formatDate,
}: {
  request: PathChangeRequest;
  formatDate: (value: string) => string;
}) {
  const { t } = useTranslation();
  const decidedAt = request.reviewed_at ?? request.created_at;
  const rejected = request.status === "rejected";
  const approved = request.status === "approved";
  const reasonText = request.decision_reason_code && request.decision_reason_code !== "other"
    ? t(`my_learning_programs.requests.rejection_reasons.${REJECTION_REASON_KEYS[request.decision_reason_code]}`)
    : "";

  return (
    <div className="rounded-lg bg-m3-surface-container px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium">
          {approved ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : rejected ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : (
            <Clock className="h-4 w-4 text-m3-on-surface-variant" />
          )}
          {approved
            ? t("my_learning_programs.requests.approved")
            : rejected
              ? t("my_learning_programs.requests.rejected")
              : request.status === "cancelled"
                ? t("my_learning_programs.requests.cancelled")
                : t("my_learning_programs.requests.invalidated")}
        </span>
        <span className="text-xs text-m3-on-surface-variant">
          {formatDate(decidedAt)}
        </span>
      </div>
      <p className="mt-1 text-xs text-m3-on-surface-variant">
        {t("my_learning_programs.requests.your_reason", { reason: request.reason })}
      </p>
      {/* The reason is the whole point of showing a rejection: a bare
          "rejected" is what makes a student re-file the same request. */}
      {rejected ? (
        <div className="mt-2 rounded-md bg-destructive/5 px-2.5 py-2">
          {reasonText ? (
            <p className="text-xs font-medium text-text-strong">{reasonText}</p>
          ) : null}
          {request.decision_reason ? (
            <p className={cn("text-xs text-m3-on-surface-variant", reasonText && "mt-1")}>
              {t("my_learning_programs.requests.dean_note", { note: request.decision_reason })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Decided requests, newest first. Renders nothing when there are none. */
export function ChangeRequestHistory({
  history,
  formatDate,
}: {
  /** Full history from the API; open requests are filtered out here because the
   *  banner above already shows them. */
  history: PathChangeRequest[];
  formatDate: (value: string) => string;
}) {
  const { t } = useTranslation();
  const decided = history.filter(
    (request) => request.status !== "pending" && request.status !== "in_progress",
  );
  if (decided.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4" /> {t("my_learning_programs.requests.history")}
      </p>
      {decided.map((request) => (
        <DecidedRequestRow
          key={request.id}
          request={request}
          formatDate={formatDate}
        />
      ))}
    </div>
  );
}
