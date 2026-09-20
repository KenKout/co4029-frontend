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
      cell: (event) => (
        <span
          className="block max-w-xl truncate text-m3-on-surface-variant"
          title={JSON.stringify(event.payload_json)}
        >
          {Object.keys(event.payload_json).length > 0
            ? JSON.stringify(event.payload_json)
            : "—"}
        </span>
      ),
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
