import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { UserEmailIdentity } from "@/components/ui/user-identity";
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
  User,
} from "@/lib/api/types";
import { useFormatDateTimeMedium } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { getUserAvatarUrl, getUserDisplayName } from "@/lib/user-identity";

type TerminalStatus = Extract<
  PathChangeRequestStatus,
  "approved" | "rejected" | "cancelled" | "invalidated"
>;

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

const RESULT_CLASSES: Record<TerminalStatus, string> = {
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-700",
  invalidated: "bg-amber-100 text-amber-800",
};

const TERMINAL_STATUSES: TerminalStatus[] = [
  "approved",
  "rejected",
  "cancelled",
  "invalidated",
];

const REASON_CODES: PathChangeRejectionReasonCode[] = [
  "insufficient_justification",
  "progress_loss_too_high",
  "target_path_not_suitable",
  "preserve_remaining_switch",
  "advising_required",
  "documentation_missing",
  "other",
];

function isTerminalStatus(status: PathChangeRequestStatus): status is TerminalStatus {
  return TERMINAL_STATUSES.includes(status as TerminalStatus);
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
  careerPathId: string | null | undefined,
  unavailableLabel: string,
): string {
  if (!careerPathId) return unavailableLabel;
  return (
    enrollment.paths.find((path) => path.career_path_id === careerPathId)?.name ??
    unavailableLabel
  );
}

function buildRows(
  requests: PathChangeRequest[],
  roster: LearningProgramEnrollment[],
  usersById: Map<string, User>,
  labels: { unknownStudent: string; unavailablePath: string; dropped: string },
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
        displayName: getUserDisplayName(user, labels.unknownStudent),
        email: user?.primary_email ?? "",
        avatarUrl: getUserAvatarUrl(user),
        fromPath: pathName(
          enrollment,
          fromAttempt?.career_path_id,
          labels.unavailablePath,
        ),
        toPath:
          request.kind === "drop"
            ? labels.dropped
            : pathName(
                enrollment,
                request.target_career_path_id,
                labels.unavailablePath,
              ),
        result: request.status,
        occurredAt: request.reviewed_at ?? request.created_at,
      },
    ];
  });
}

function ResultBadge({ status, label }: { status: TerminalStatus; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        RESULT_CLASSES[status],
      )}
    >
      {label}
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
  const { t } = useTranslation();
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
    const map = new Map<string, User>();
    for (const user of users.data ?? []) map.set(user.id, user);
    return map;
  }, [users.data]);
  const allRows = useMemo(
    () =>
      buildRows(requests, roster, usersById, {
        unknownStudent: t("management_learning_program_detail.history.unknown_student"),
        unavailablePath: t("management_learning_program_detail.history.unavailable_path"),
        dropped: t("management_learning_program_detail.history.dropped"),
      }),
    [requests, roster, t, usersById],
  );
  const filters = useMemo<FilterDef[]>(
    () => [
      {
        id: "result",
        label: t("management_learning_program_detail.history.result"),
        allLabel: t("management_learning_program_detail.history.all_results"),
        options: TERMINAL_STATUSES.map((value) => ({
          value,
          label: t(`management_learning_program_detail.history.results.${value}`),
        })),
      },
      {
        id: "reason",
        label: t("management_learning_program_detail.history.decision_reason"),
        allLabel: t("management_learning_program_detail.history.all_reasons"),
        options: REASON_CODES.map((value) => ({
          value,
          label: t(`management_learning_program_detail.history.reasons.${value}`),
        })),
      },
    ],
    [t],
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
        row.request.decision_note ?? "",
        row.request.decision_reason_code
          ? t(
              `management_learning_program_detail.history.reasons.${row.request.decision_reason_code}`,
            )
          : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [allRows, customTimeRange, reason, result, search, students, t, timeRange]);

  const columns = useMemo<DataTableColumn<HistoryRow>[]>(
    () => [
      {
        id: "student",
        header: t("management_learning_program_detail.history.student"),
        sortable: true,
        sortValue: (row) => row.displayName.toLowerCase(),
        cell: (row) => (
          <Link
            to="/management/users/$userId"
            params={{ userId: row.studentId }}
            className="flex min-w-[180px] items-center gap-3 rounded-lg"
          >
            <UserEmailIdentity
              id={row.studentId}
              displayName={row.displayName}
              avatarUrl={row.avatarUrl}
              email={row.email}
              className="hover:[&_p:first-child]:text-m3-primary"
            />
          </Link>
        ),
      },
      {
        id: "transition",
        header: t("management_learning_program_detail.history.transition"),
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
        header: t("management_learning_program_detail.history.result"),
        sortable: true,
        sortValue: (row) => row.result,
        cell: (row) => (
          <ResultBadge
            status={row.result}
            label={t(
              `management_learning_program_detail.history.results.${row.result}`,
            )}
          />
        ),
      },
      {
        id: "time",
        header: t("management_learning_program_detail.history.time"),
        sortable: true,
        sortValue: (row) => row.occurredAt,
        cell: (row) => (
          <div className="min-w-[125px] text-xs">
            <p className="font-medium">{formatDateTime(row.occurredAt)}</p>
            <p className="mt-1 text-text-muted">
              {t("management_learning_program_detail.history.requested_at", {
                value: formatDateTime(row.request.created_at),
              })}
            </p>
          </div>
        ),
      },
      {
        id: "reason",
        header: t("management_learning_program_detail.history.reason"),
        cell: (row) => (
          <div className="min-w-[220px] max-w-sm text-xs">
            <p>
              <span className="font-semibold">
                {t("management_learning_program_detail.history.student_reason")}
              </span>{" "}
              {row.request.reason}
            </p>
            {row.request.decision_reason_code ? (
              <p className="mt-1 text-text-muted">
                <span className="font-semibold text-text-strong">
                  {t("management_learning_program_detail.history.decision")}
                </span>{" "}
                {t(
                  `management_learning_program_detail.history.reasons.${row.request.decision_reason_code}`,
                )}
                {row.request.decision_reason_code === "other" &&
                row.request.decision_reason
                  ? ` · ${row.request.decision_reason}`
                  : ""}
              </p>
            ) : null}
            {row.request.decision_note ||
            (row.request.decision_reason_code !== "other" &&
              row.request.decision_reason) ? (
              <p className="mt-1 text-text-muted">
                <span className="font-semibold text-text-strong">
                  {t("management_learning_program_detail.history.decision_note")}
                </span>{" "}
                {row.request.decision_note ?? row.request.decision_reason}
              </p>
            ) : null}
          </div>
        ),
      },
    ],
    [formatDateTime, t],
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
        <h2 className="font-headline text-lg font-bold">
          {t("management_learning_program_detail.history.title")}
        </h2>
        <p className="mt-0.5 text-sm text-m3-on-surface-variant">
          {t("management_learning_program_detail.history.description")}
        </p>
      </div>

      <div className="max-w-xl space-y-1.5">
        <p className="text-xs font-semibold text-m3-on-surface-variant">
          {t("management_learning_program_detail.history.students")}
        </p>
        <SearchableMultiSelect
          options={studentOptions}
          value={students}
          onValueChange={setStudents}
          label={t("management_learning_program_detail.history.student_filter")}
          placeholder={t("management_learning_program_detail.history.student_search")}
          emptyText={t("management_learning_program_detail.history.student_empty")}
          removeLabel={(label) =>
            t("management_learning_program_detail.history.remove_filter", {
              name: label,
            })
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        getRowId={(row) => row.request.id}
        loading={users.isLoading && studentIds.length > 0}
        emptyState={
          allRows.length === 0
            ? t("management_learning_program_detail.history.empty")
            : t("management_learning_program_detail.history.empty_filtered")
        }
        toolbar={
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("management_learning_program_detail.history.search")}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            customTimeRange={customTimeRange}
            onCustomTimeRangeChange={setCustomTimeRange}
            timeRangeAriaLabel={t("management_learning_program_detail.history.time_filter")}
            filters={filters}
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
