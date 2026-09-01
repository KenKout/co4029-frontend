import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Eye, Loader2 } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUsersByIds } from "@/lib/api/hooks/admin";
import { cn } from "@/lib/utils";
import type {
  LearningProgramEnrollment,
  PathChangeRejectionReasonCode,
  PathChangeRequest,
  PathChangeRequestStatus,
} from "@/lib/api/types";
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
  { label: string; className: string }
> = {
  pending: {
    label: "Awaiting review",
    className: "bg-amber-100 text-amber-900",
  },
  in_progress: {
    label: "In progress",
    className: "bg-m3-primary-fixed text-m3-primary",
  },
};

type RequestStudent = {
  id: string;
  display_name?: string | null;
  primary_email?: string;
  avatar_url?: string | null;
};

/** Requester identity cell: avatar + name + email, linking to their detail page. */
function RequesterCell({
  studentId,
  user,
}: {
  studentId: string | undefined;
  user: RequestStudent | undefined;
}) {
  if (!studentId) return <div className="flex min-w-0 items-center gap-3" />;
  const displayName =
    user?.display_name?.trim() || user?.primary_email || "Unknown student";
  const email = user?.primary_email ?? "";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        to="/management/users/$userId"
        params={{ userId: studentId }}
        className="flex min-w-0 items-center gap-3 rounded-lg"
      >
        <Avatar size="sm" className={avatarColor(studentId)}>
          {user?.avatar_url ? (
            <AvatarImage src={user.avatar_url} alt={displayName} />
          ) : null}
          <AvatarFallback>
            {avatarInitials(displayName, { uppercase: true })}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-strong hover:text-m3-primary">
            {displayName}
          </p>
          {email ? (
            <p className="mt-0.5 truncate text-[11px] text-text-muted">{email}</p>
          ) : null}
        </div>
      </Link>
    </div>
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
  user: RequestStudent | undefined;
  marking: boolean;
  onApprove: () => void;
  onMarkInProgress: () => void;
  onOpenReject: () => void;
}) {
  const acknowledged = request.status === "in_progress";
  const chip = STATUS_CHIP[acknowledged ? "in_progress" : "pending"];

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
          {chip.label}
        </span>
        <p className="mt-1 truncate text-sm" title={request.reason}>
          {request.reason}
        </p>
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
            {marking ? "Marking…" : "Mark in progress"}
          </Button>
        ) : null}
        <Button size="sm" className="gap-1" onClick={onApprove}>
          <Check className="h-4 w-4" /> Approve
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
    note: string,
  ) => Promise<unknown>;
  onMarkInProgress: (request: PathChangeRequest) => void;
  /** Id of the request whose acknowledgement is in flight, if any. */
  markingInProgressId?: string | null;
  isRejecting?: boolean;
}) {
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
    const map = new Map<string, RequestStudent>();
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
        No open requests.
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
            rejectStudent?.display_name?.trim() ||
            rejectStudent?.primary_email ||
            "this student"
          }
          isPending={Boolean(isRejecting)}
          onReject={(reasonCode, note) => {
            void onReject(rejectTarget, reasonCode, note).then(() =>
              setRejectTarget(null),
            );
          }}
        />
      ) : null}
    </>
  );
}
