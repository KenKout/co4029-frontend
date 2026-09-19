import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar, type FilterDef } from "@/components/ui/data-table-toolbar";
import { useQuizAuditEvents, type AuditEventRow } from "@/lib/api/hooks/quizzes";

export function AuditEventsTab({ quizId }: { quizId: string }) {
  const { t } = useTranslation();
  const { data: events, isLoading } = useQuizAuditEvents(quizId);
  const [search, setSearch] = useState("");
  const [eventName, setEventName] = useState("all");
  const eventOptions = useMemo(() => Array.from(new Set((events ?? []).map((event) => event.event_name))).sort(), [events]);
  const eventFilter: FilterDef = {
    id: "event",
    label: t("teacher_quiz_results.audit.event_filter"),
    options: [
      { value: "all", label: t("teacher_quiz_results.filters.all") },
      ...eventOptions.map((value) => ({ value, label: t(`teacher_quiz_results.audit.events.${value}`, { defaultValue: value }) })),
    ],
  };
  const rows = useMemo(() => (events ?? []).filter((event) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || `${event.event_name} ${JSON.stringify(event.payload_json)}`.toLowerCase().includes(needle);
    return matchesSearch && (eventName === "all" || event.event_name === eventName);
  }), [events, search, eventName]);
  const columns: DataTableColumn<AuditEventRow>[] = [
    { id: "event", header: t("teacher_quiz_results.audit.col_event"), cell: (event) => <span className="inline-block rounded-md bg-m3-surface-container px-2 py-0.5 text-xs font-medium text-m3-on-surface">{t(`teacher_quiz_results.audit.events.${event.event_name}`, { defaultValue: event.event_name })}</span> },
    { id: "when", header: t("teacher_quiz_results.audit.col_when"), sortable: true, sortValue: (event) => new Date(event.occurred_at), cell: (event) => <span className="whitespace-nowrap text-m3-on-surface-variant">{new Date(event.occurred_at).toLocaleString()}</span> },
    { id: "details", header: t("teacher_quiz_results.audit.col_details"), cell: (event) => <span className="block max-w-xl truncate text-m3-on-surface-variant" title={JSON.stringify(event.payload_json)}>{Object.keys(event.payload_json).length > 0 ? JSON.stringify(event.payload_json) : "—"}</span> },
  ];
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-m3-secondary" /></div>;
  return (
    <div className="space-y-3">
      <DataTableToolbar search={search} onSearchChange={setSearch} searchPlaceholder={t("teacher_quiz_results.filters.search_audit")} filters={[eventFilter]} filterValues={{ event: eventName }} onFilterChange={(_, value) => setEventName(value ?? "all")} />
      <DataTable columns={columns} data={rows} getRowId={(event) => event.id} emptyState={t("teacher_quiz_results.audit.empty")} pagination pageSize={10} pageSizeOptions={[10, 25, 50]} bordered={false} containerClassName="overflow-hidden rounded-xl border border-m3-outline-variant bg-card" />
    </div>
  );
}
