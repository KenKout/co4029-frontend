import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserEmailIdentity } from "@/components/ui/user-identity";
import { useUsersByIds } from "@/lib/api/hooks/admin";
import { useFormatDateTimeMedium } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type {
  LearningProgramEnrollment,
  PathChangeRejectionReasonCode,
  PathChangeRequest,
  PathChangeRequestStatus,
  PathRequestKind,
  User,
} from "@/lib/api/types";
import { getUserAvatarUrl, getUserDisplayName } from "@/lib/user-identity";
import {
  RejectButton,
  RejectPathChangeDialog,
} from "./RejectPathChangeDialog";

/**
 * Open path-change review list for a program.
 *
 * The API row carries only `program_enrollment_id`, so the list used to show
 * a bare UUID as the requester. Identity comes from the program roster
 * (enrollment -> student) plus the same `/users/by-ids` batch lookup the
 * roster tab uses, so both surfaces render people identically: avatar,
 * display name, email — and clicking opens the student detail page.
 *
 * Requests here are OPEN, which is two states, not one:
 *
 * * `pending` — nobody has touched it. Offers "Mark in progress" so the dean
 *   can tell the student their request was received before they finish
 *   checking the data (that check can take days; silence reads as neglect).
 * * `in_progress` — already acknowledged, so the acknowledge button is gone;
 *   only the decision remains.
 *
 * Both are decidable — acknowledging is not a required step, just an available
 * one.
 */

const STATUS_CHIP: Record<
  Extract<PathChangeRequestStatus, "pending" | "in_progress">,
  { labelKey: string; className: string }
> = {
  pending: {
    labelKey: "management_learning_program_detail.requests.awaiting",
    className: "bg-amber-100 text-amber-900",
  },
  in_progress: {
    labelKey: "management_learning_program_detail.requests.in_progress",
    className: "bg-m3-primary-fixed text-m3-primary",
  },
};

/**
 * What the student is asking for, as a chip beside the status.
 *
 * The row shows the reason and the status but never named the destination, so
 * before this a dean could not tell a switch from a drop without opening the
 * request — and the two decisions are not interchangeable: approving a drop
 * removes a path and grants nothing back.
 */
const KIND_CHIP: Record<PathRequestKind, { labelKey: string; className: string }> = {
  change: {
    labelKey: "management_learning_program_detail.requests.kind_change",
    className: "bg-m3-surface-container-high text-text-muted",
  },
  drop: {
    labelKey: "management_learning_program_detail.requests.kind_drop",
    className: "bg-rose-100 text-rose-900",
  },
};

/** Requester identity cell: avatar + name + email, linking to their detail page. */
function RequesterCell({
  studentId,
  user,
}: {
  studentId: string | undefined;
  user: User | undefined;
}) {
  const { t } = useTranslation();
  if (!studentId) return <div className="flex min-w-0 items-center gap-3" />;
  const displayName = getUserDisplayName(
    user,
    t("management_learning_program_detail.requests.unknown_student"),
  );
  return (
    <Link
      to="/management/users/$userId"
      params={{ userId: studentId }}
      className="flex min-w-0 items-center gap-3 rounded-lg"
    >
      <UserEmailIdentity
        id={studentId}
        displayName={displayName}
        avatarUrl={getUserAvatarUrl(user)}
        email={user?.primary_email ?? ""}
        className="hover:[&_p:first-child]:text-m3-primary"
      />
    </Link>
  );
}

function RequestRow({
  request,
  studentId,
  user,
  marking,
  onApprove,
  onMarkInProgress,
  onOpenReject,
}: {
  request: PathChangeRequest;
  studentId: string | undefined;
  user: User | undefined;
  marking: boolean;
  onApprove: () => void;
  onMarkInProgress: () => void;
  onOpenReject: () => void;
}) {
  const { t } = useTranslation();
  const acknowledged = request.status === "in_progress";
  const chip = STATUS_CHIP[acknowledged ? "in_progress" : "pending"];
  const kindChip = KIND_CHIP[request.kind];
  const formatDateTime = useFormatDateTimeMedium();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-m3-surface-container p-4">
      <RequesterCell studentId={studentId} user={user} />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
            chip.className,
          )}
        >
          {t(chip.labelKey)}
        </span>
        <span
          className={cn(
            "ml-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
            kindChip.className,
          )}
        >
          {t(kindChip.labelKey)}
        </span>
        <p className="mt-1 truncate text-sm" title={request.reason}>
          {request.reason}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-muted">
          <span>
            {t("management_learning_program_detail.requests.requested_at", {
              value: formatDateTime(request.created_at),
            })}
          </span>
          {request.in_progress_at ? (
            <span>
              {t("management_learning_program_detail.requests.review_started_at", {
                value: formatDateTime(request.in_progress_at),
              })}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        {/* Acknowledgement is offered only while untouched: re-sending the
            "we've seen it" signal to a student adds nothing. */}
        {!acknowledged ? (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1"
            disabled={marking}
            onClick={onMarkInProgress}
          >
            {marking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {marking
              ? t("management_learning_program_detail.actions.marking")
              : t("management_learning_program_detail.actions.mark_in_progress")}
          </Button>
        ) : null}
        <Button size="sm" className="gap-1" onClick={onApprove}>
          <Check className="h-4 w-4" />
          {t("management_learning_program_detail.actions.approve")}
        </Button>
        <RejectButton onClick={onOpenReject} />
      </div>
    </div>
  );
}

export function PathChangeRequestsSection({
  requests,
  roster,
  onApprove,
  onReject,
  onMarkInProgress,
  markingInProgressId,
  isRejecting,
}: {
  requests: PathChangeRequest[];
  roster: LearningProgramEnrollment[];
  onApprove: (request: PathChangeRequest) => void;
  /** Called from the reject dialog once a reason has been chosen. */
  onReject: (
    request: PathChangeRequest,
    reasonCode: PathChangeRejectionReasonCode,
    reason: string,
    note: string,
  ) => Promise<unknown>;
  onMarkInProgress: (request: PathChangeRequest) => void;
  /** Id of the request whose acknowledgement is in flight, if any. */
  markingInProgressId?: string | null;
  isRejecting?: boolean;
}) {
  const { t } = useTranslation();
  const [rejectTarget, setRejectTarget] = useState<PathChangeRequest | null>(null);

  const studentByEnrollment = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of roster) map.set(item.id, item.student_id);
    return map;
  }, [roster]);

  const studentIds = useMemo(
    () =>
      [...new Set(requests.map((r) => studentByEnrollment.get(r.program_enrollment_id)).filter((id): id is string => Boolean(id)))],
    [requests, studentByEnrollment],
  );
  const users = useUsersByIds(studentIds);
  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of users.data ?? []) map.set(u.id, u);
    return map;
  }, [users.data]);

  function studentFor(request: PathChangeRequest) {
    const studentId = studentByEnrollment.get(request.program_enrollment_id);
    return { studentId, user: studentId ? usersById.get(studentId) : undefined };
  }

  if (requests.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-m3-on-surface-variant">
        {t("management_learning_program_detail.requests.empty")}
      </p>
    );
  }

  const rejectStudent = rejectTarget ? studentFor(rejectTarget).user : undefined;

  return (
    <>
      <div className="space-y-3">
        {requests.map((request) => {
          const { studentId, user } = studentFor(request);
          return (
            <RequestRow
              key={request.id}
              request={request}
              studentId={studentId}
              user={user}
              marking={markingInProgressId === request.id}
              onApprove={() => onApprove(request)}
              onMarkInProgress={() => onMarkInProgress(request)}
              onOpenReject={() => setRejectTarget(request)}
            />
          );
        })}
      </div>

      {rejectTarget ? (
        <RejectPathChangeDialog
          open
          onOpenChange={(next) => {
            if (!next) setRejectTarget(null);
          }}
          studentName={
            getUserDisplayName(
              rejectStudent,
              t("management_learning_program_detail.requests.unknown_student"),
            )
          }
          isPending={Boolean(isRejecting)}
          onReject={(reasonCode, reason, note) => {
            void onReject(rejectTarget, reasonCode, reason, note).then(() =>
              setRejectTarget(null),
            );
          }}
        />
      ) : null}
    </>
  );
}
