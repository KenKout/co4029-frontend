import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  DataTableToolbar,
  type CustomTimeRange,
  type FilterDef,
  type TimeRange,
} from "@/components/ui/data-table-toolbar";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { useUsersByIds } from "@/lib/api/hooks/admin";
import type {
  LearningProgramEnrollment,
  PathChangeRejectionReasonCode,
  PathChangeRequest,
  PathChangeRequestStatus,
} from "@/lib/api/types";
import { useFormatDateTimeMedium } from "@/lib/format/date";
import { cn } from "@/lib/utils";

type TerminalStatus = Extract<
  PathChangeRequestStatus,
  "approved" | "rejected" | "cancelled" | "invalidated"
>;

type HistoryUser = {
  id: string;
  display_name?: string | null;
  primary_email?: string;
  avatar_url?: string | null;
};

interface HistoryRow {
  request: PathChangeRequest;
  studentId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  fromPath: string;
  toPath: string;
  result: TerminalStatus;
  occurredAt: string;
}

const RESULT_LABELS: Record<TerminalStatus, string> = {
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled by student",
  invalidated: "Invalidated",
};

const RESULT_CLASSES: Record<TerminalStatus, string> = {
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-700",
  invalidated: "bg-amber-100 text-amber-800",
};

const REASON_LABELS: Record<PathChangeRejectionReasonCode, string> = {
  insufficient_justification: "Insufficient justification",
  progress_loss_too_high: "Progress loss too high",
  target_path_not_suitable: "Target path not suitable",
  preserve_remaining_switch: "Preserve remaining switch",
  advising_required: "Advising required",
  documentation_missing: "Documentation missing",
  other: "Other",
};

const RESULT_FILTER: FilterDef = {
  id: "result",
  label: "Result",
  allLabel: "All results",
  options: Object.entries(RESULT_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
};

const REASON_FILTER: FilterDef = {
  id: "reason",
  label: "Decision reason",
  allLabel: "All reasons",
  options: Object.entries(REASON_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
};

function isTerminalStatus(status: PathChangeRequestStatus): status is TerminalStatus {
  return ["approved", "rejected", "cancelled", "invalidated"].includes(status);
}

function boundsForRange(
  range: TimeRange,
  custom: CustomTimeRange | undefined,
): { from?: number; until?: number } {
  if (range === "all") return {};
  if (range === "custom") {
    const from = custom?.from
      ? new Date(`${custom.from}T00:00:00`).getTime()
      : undefined;
    const untilDate = custom?.to
      ? new Date(`${custom.to}T00:00:00`)
      : undefined;
    if (untilDate) untilDate.setDate(untilDate.getDate() + 1);
    return { from, until: untilDate?.getTime() };
  }

  const now = new Date();
  if (range === "today" || range === "yesterday") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (range === "yesterday") start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { from: start.getTime(), until: end.getTime() };
  }

  const days =
    range === "week"
      ? 7
      : range === "month"
        ? 30
        : range === "6months"
          ? 180
          : 365;
  return { from: now.getTime() - days * 86_400_000 };
}

function pathName(
  enrollment: LearningProgramEnrollment,
  careerPathId: string | undefined,
): string {
  if (!careerPathId) return "Unavailable path";
  return (
    enrollment.paths.find((path) => path.career_path_id === careerPathId)?.name ??
    "Unavailable path"
  );
}

function buildRows(
  requests: PathChangeRequest[],
  roster: LearningProgramEnrollment[],
  usersById: Map<string, HistoryUser>,
): HistoryRow[] {
  const enrollmentById = new Map(roster.map((item) => [item.id, item]));

  return requests.flatMap((request) => {
    if (!isTerminalStatus(request.status)) return [];
    const enrollment = enrollmentById.get(request.program_enrollment_id);
    if (!enrollment) return [];
    const user = usersById.get(enrollment.student_id);
    const fromAttempt = enrollment.attempts.find(
      (attempt) => attempt.id === request.from_attempt_id,
    );
    return [
      {
        request,
        studentId: enrollment.student_id,
        displayName:
          user?.display_name?.trim() ||
          user?.primary_email ||
          "Unknown student",
        email: user?.primary_email ?? "",
        avatarUrl: user?.avatar_url ?? null,
        fromPath: pathName(enrollment, fromAttempt?.career_path_id),
        toPath: pathName(enrollment, request.target_career_path_id),
        result: request.status,
        occurredAt: request.reviewed_at ?? request.created_at,
      },
    ];
  });
}

function ResultBadge({ status }: { status: TerminalStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        RESULT_CLASSES[status],
      )}
    >
      {RESULT_LABELS[status]}
    </span>
  );
}

/** Read-only audit view for requests that have left the dean's open queue. */
export function PathChangeHistoryTab({
  requests,
  roster,
}: {
  requests: PathChangeRequest[];
  roster: LearningProgramEnrollment[];
}) {
  const formatDateTime = useFormatDateTimeMedium();
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [customTimeRange, setCustomTimeRange] = useState<CustomTimeRange>();
  const [result, setResult] = useState<string>();
  const [reason, setReason] = useState<string>();

  const studentIds = useMemo(
    () => [...new Set(roster.map((item) => item.student_id))],
    [roster],
  );
  const users = useUsersByIds(studentIds);
  const usersById = useMemo(() => {
    const map = new Map<string, HistoryUser>();
    for (const user of users.data ?? []) map.set(user.id, user);
    return map;
  }, [users.data]);
  const allRows = useMemo(
    () => buildRows(requests, roster, usersById),
    [requests, roster, usersById],
  );
  const studentOptions = useMemo(
    () =>
      [...new Map(allRows.map((row) => [row.studentId, row])).values()]
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((row) => ({
          value: row.studentId,
          label: row.email
            ? `${row.displayName} · ${row.email}`
            : row.displayName,
        })),
    [allRows],
  );

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const bounds = boundsForRange(timeRange, customTimeRange);
    return allRows.filter((row) => {
      const occurredAt = new Date(row.occurredAt).getTime();
      if (students.length > 0 && !students.includes(row.studentId)) return false;
      if (result && row.result !== result) return false;
      if (reason && row.request.decision_reason_code !== reason) return false;
      if (bounds.from !== undefined && occurredAt < bounds.from) return false;
      if (bounds.until !== undefined && occurredAt >= bounds.until) return false;
      if (!needle) return true;
      return [
        row.displayName,
        row.email,
        row.fromPath,
        row.toPath,
        row.request.reason,
        row.request.decision_reason ?? "",
        row.request.decision_reason_code
          ? REASON_LABELS[row.request.decision_reason_code]
          : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [allRows, customTimeRange, reason, result, search, students, timeRange]);

  const columns = useMemo<DataTableColumn<HistoryRow>[]>(
    () => [
      {
        id: "student",
        header: "Student",
        sortable: true,
        sortValue: (row) => row.displayName.toLowerCase(),
        cell: (row) => (
          <Link
            to="/management/users/$userId"
            params={{ userId: row.studentId }}
            className="flex min-w-[180px] items-center gap-3 rounded-lg"
          >
            <Avatar size="sm" className={avatarColor(row.studentId)}>
              {row.avatarUrl ? (
                <AvatarImage src={row.avatarUrl} alt={row.displayName} />
              ) : null}
              <AvatarFallback>
                {avatarInitials(row.displayName, { uppercase: true })}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold hover:text-m3-primary">
                {row.displayName}
              </p>
              {row.email ? (
                <p className="truncate text-[11px] text-text-muted">{row.email}</p>
              ) : null}
            </div>
          </Link>
        ),
      },
      {
        id: "transition",
        header: "Career Path transition",
        cell: (row) => (
          <div className="flex min-w-[210px] items-center gap-2 text-sm">
            <span className="font-medium">{row.fromPath}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-m3-outline" />
            <span className="font-semibold text-m3-primary">{row.toPath}</span>
          </div>
        ),
      },
      {
        id: "result",
        header: "Result",
        sortable: true,
        sortValue: (row) => row.result,
        cell: (row) => <ResultBadge status={row.result} />,
      },
      {
        id: "time",
        header: "Time",
        sortable: true,
        sortValue: (row) => row.occurredAt,
        cell: (row) => (
          <div className="min-w-[125px] text-xs">
            <p className="font-medium">{formatDateTime(row.occurredAt)}</p>
            <p className="mt-1 text-text-muted">
              Requested {formatDateTime(row.request.created_at)}
            </p>
          </div>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        cell: (row) => (
          <div className="min-w-[220px] max-w-sm text-xs">
            <p>
              <span className="font-semibold">Student:</span> {row.request.reason}
            </p>
            {row.request.decision_reason_code ? (
              <p className="mt-1 text-text-muted">
                <span className="font-semibold text-text-strong">Decision:</span>{" "}
                {REASON_LABELS[row.request.decision_reason_code]}
                {row.request.decision_reason
                  ? ` · ${row.request.decision_reason}`
                  : ""}
              </p>
            ) : null}
          </div>
        ),
      },
    ],
    [formatDateTime],
  );

  function resetFilters() {
    setSearch("");
    setStudents([]);
    setTimeRange("all");
    setCustomTimeRange(undefined);
    setResult(undefined);
    setReason(undefined);
  }

  return (
    <section className="space-y-4 rounded-xl bg-card p-5 ghost-border">
      <div>
        <h2 className="font-headline text-lg font-bold">Career Path change history</h2>
        <p className="mt-0.5 text-sm text-m3-on-surface-variant">
          Review completed decisions, the student's reason, and the exact path
          transition. Open requests remain in the Path changes tab.
        </p>
      </div>

      <div className="max-w-xl space-y-1.5">
        <p className="text-xs font-semibold text-m3-on-surface-variant">
          Students
        </p>
        <SearchableMultiSelect
          options={studentOptions}
          value={students}
          onValueChange={setStudents}
          label="Filter by students"
          placeholder="Search and select students…"
          emptyText="No student with path-change history"
          removeLabel={(label) => `Remove ${label} from filter`}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        getRowId={(row) => row.request.id}
        loading={users.isLoading && studentIds.length > 0}
        emptyState={
          allRows.length === 0
            ? "No completed Career Path changes yet"
            : "No history matches these filters"
        }
        toolbar={
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search path or reason…"
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            customTimeRange={customTimeRange}
            onCustomTimeRangeChange={setCustomTimeRange}
            timeRangeAriaLabel="Filter by decision time"
            filters={[RESULT_FILTER, REASON_FILTER]}
            filterValues={{ result, reason }}
            onFilterChange={(id, value) => {
              if (id === "result") setResult(value);
              if (id === "reason") setReason(value);
            }}
            onResetAllFilters={resetFilters}
          />
        }
      />
    </section>
  );
}
