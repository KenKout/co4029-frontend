import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Check, X } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUsersByIds } from "@/lib/api/hooks/admin";
import type {
  LearningProgramEnrollment,
  PathChangeRequest,
} from "@/lib/api/types";

/**
 * Pending path-change review list for a program.
 *
 * The API row carries only `program_enrollment_id`, so the list used to show
 * a bare UUID as the requester. Identity comes from the program roster
 * (enrollment -> student) plus the same `/users/by-ids` batch lookup the
 * roster tab uses, so both surfaces render people identically: avatar,
 * display name, email — and clicking opens the student detail page.
 */
export function PathChangeRequestsSection({
  requests,
  roster,
  onDecide,
}: {
  requests: PathChangeRequest[];
  roster: LearningProgramEnrollment[];
  onDecide: (request: PathChangeRequest, approve: boolean) => void;
}) {
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
    const map = new Map<string, { display_name?: string | null; primary_email?: string; avatar_url?: string | null; id: string }>();
    for (const u of users.data ?? []) map.set(u.id, u);
    return map;
  }, [users.data]);

  if (requests.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-m3-on-surface-variant">
        No pending requests.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const studentId = studentByEnrollment.get(request.program_enrollment_id);
        const user = studentId ? usersById.get(studentId) : undefined;
        const displayName =
          user?.display_name?.trim() || user?.primary_email || "Unknown student";
        const email = user?.primary_email ?? "";

        return (
          <div
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-m3-surface-container p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              {studentId ? (
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
                      <p className="mt-0.5 truncate text-[11px] text-text-muted">
                        {email}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ) : null}
            </div>
            <p className="min-w-0 flex-1 truncate text-sm" title={request.reason}>
              {request.reason}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gap-1"
                onClick={() => onDecide(request, true)}
              >
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => onDecide(request, false)}
              >
                <X className="h-4 w-4" /> Reject
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
