import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { DataTableColumn } from "@/components/ui/data-table";
import {
  DataTableToolbar,
  type FilterDef,
} from "@/components/ui/data-table-toolbar";
import type { AuditEventRow } from "@/lib/api/hooks/quizzes";
import { QuizResultsDataTable } from "./QuizResultsDataTable";
import { useServerTable } from "@/lib/api/use-server-table";

const QUIZ_AUDIT_EVENTS = [
  "attempt_started",
  "attempt_submitted",
  "attempt_regraded",
  "attempt_manually_graded",
  "override_created",
  "override_updated",
  "override_deleted",
  "question_edited",
  "quiz_published",
  "quiz_archived",
] as const;

function humanizeAuditKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character: string) => character.toUpperCase());
}

function formatAuditValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    typeof value === "symbol"
  ) {
    return value.toString();
  }
  return "—";
}

function AuditDetails({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload);
  if (entries.length === 0) return <span className="text-m3-on-surface-variant">—</span>;

  return (
    <div
      className="max-w-2xl space-y-1 py-1 text-sm"
      title={JSON.stringify(payload, null, 2)}
    >
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="grid min-w-0 grid-cols-1 gap-0.5 sm:grid-cols-[minmax(8rem,max-content)_minmax(0,1fr)] sm:gap-x-3"
        >
          <span className="font-medium text-m3-on-surface-variant">
            {humanizeAuditKey(key)}
          </span>
          <code className="min-w-0 break-words whitespace-pre-wrap font-mono text-xs text-m3-on-surface">
            {formatAuditValue(value)}
          </code>
        </div>
      ))}
    </div>
  );
}

export function AuditEventsTab({ quizId }: { quizId: string }) {
  const { t } = useTranslation();
  const [eventName, setEventName] = useState("all");
  const table = useServerTable<AuditEventRow>({
    queryKey: ["quiz-results", quizId, "audit"],
    path: `/teacher/quizzes/${quizId}/audit-events`,
    filters: { event_name: eventName === "all" ? undefined : eventName },
    initialSort: { columnId: "when", direction: "desc" },
  });
  const eventFilter: FilterDef = {
    id: "event",
    label: t("teacher_quiz_results.audit.event_filter"),
    allLabel: t("teacher_quiz_results.audit.all_events"),
    options: [
      ...QUIZ_AUDIT_EVENTS.map((value) => ({
        value,
        label: t(`teacher_quiz_results.audit.events.${value}`, {
          defaultValue: value,
        }),
      })),
    ],
  };
  const columns: DataTableColumn<AuditEventRow>[] = [
    {
      id: "event",
      header: t("teacher_quiz_results.audit.col_event"),
      sortable: true,
      sortValue: (event) => event.event_name,
      cell: (event) => (
        <span className="inline-block rounded-md bg-m3-surface-container px-2 py-0.5 text-xs font-medium text-m3-on-surface">
          {t(`teacher_quiz_results.audit.events.${event.event_name}`, {
            defaultValue: event.event_name,
          })}
        </span>
      ),
    },
    {
      id: "when",
      header: t("teacher_quiz_results.audit.col_when"),
      sortable: true,
      sortValue: (event) => new Date(event.occurred_at),
      cell: (event) => (
        <span className="whitespace-nowrap text-m3-on-surface-variant">
          {new Date(event.occurred_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: "details",
      header: t("teacher_quiz_results.audit.col_details"),
      cell: (event) => <AuditDetails payload={event.payload_json} />,
    },
  ];
  return (
    <div className="space-y-3">
      <DataTableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t("teacher_quiz_results.filters.search_audit")}
        filters={[eventFilter]}
        filterValues={{ event: eventName }}
        onFilterChange={(_, value) => setEventName(value ?? "all")}
      />
      <QuizResultsDataTable
        columns={columns}
        data={table.rows}
        getRowId={(event) => event.id}
        emptyState={t("teacher_quiz_results.audit.empty")}
        bordered={false}
        containerClassName="overflow-hidden rounded-xl border border-m3-outline-variant bg-card"
        manualPagination
        manualSorting
        rowCount={table.total}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sort={table.sort}
        onSortChange={table.setSort}
        loading={table.isLoading || table.isFetching}
      />
    </div>
  );
}
