import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollText, ShieldCheck, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useAuditDataChanges,
  useAuditHttp,
  useAuditRoleChanges,
} from "@/lib/api/hooks/admin";
import { DATA_CHANGE_TABLES, type DataChangeTable } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type TabKey = "role_changes" | "data_changes" | "http";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** FR-6.7 — admin viewer over the immutable audit endpoints. */
export default function AdminAuditLogsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>("role_changes");
  const [sinceDays, setSinceDays] = useState(7);
  const sinceIso = useMemo(() => daysAgoIso(sinceDays), [sinceDays]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline font-bold text-2xl text-m3-on-surface flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-m3-primary" />
            {t("admin.audit.title")}
          </h1>
          <p className="text-sm text-m3-on-surface-variant mt-1">
            {t("admin.audit.subtitle")}
          </p>
        </div>
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant flex items-center gap-2">
          {t("admin.audit.since_days")}
          <Input
            type="number"
            min={1}
            max={90}
            value={sinceDays}
            onChange={(e) => setSinceDays(Math.max(1, Number(e.target.value) || 7))}
            className="w-20 h-8"
          />
        </label>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["role_changes", "data_changes", "http"] as TabKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              tab === key
                ? "bg-m3-primary text-white"
                : "bg-m3-surface-container text-m3-on-surface-variant hover:bg-m3-surface-container-high",
            )}
          >
            {t(`admin.audit.tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === "role_changes" ? (
        <RoleChangesTable sinceIso={sinceIso} />
      ) : tab === "data_changes" ? (
        <DataChangesPanel />
      ) : (
        <HttpAuditTable sinceIso={sinceIso} />
      )}
    </div>
  );
}

/**
 * FR-6.7 — on-demand data-change lookup. Unlike the time-windowed scans,
 * this is a by-PK lookup: pick an entity type, paste a UUID, and see who
 * created / last-updated / soft-deleted it. `sinceIso` is irrelevant here.
 */
function DataChangesPanel() {
  const { t } = useTranslation();
  const [table, setTable] = useState<DataChangeTable>("courses");
  const [idInput, setIdInput] = useState("");
  const [submittedId, setSubmittedId] = useState("");

  const trimmed = idInput.trim();
  const invalid = trimmed.length > 0 && !UUID_RE.test(trimmed);

  const submit = () => {
    if (UUID_RE.test(trimmed)) setSubmittedId(trimmed);
  };

  const { data, isLoading, isError, error } = useAuditDataChanges(
    table,
    submittedId,
  );
  // A 404 surfaces as a thrown error from apiFetch; treat it as "not found".
  const notFound =
    isError && String((error as Error)?.message ?? "").includes("404");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("admin.audit.data_changes.table_label")}
          <select
            value={table}
            onChange={(e) => {
              setTable(e.target.value as DataChangeTable);
              setSubmittedId("");
            }}
            className="h-9 rounded-lg border border-m3-outline-variant/40 bg-card px-3 text-sm font-normal normal-case text-m3-on-surface"
          >
            {DATA_CHANGE_TABLES.map((tbl) => (
              <option key={tbl} value={tbl}>
                {t(`admin.audit.data_changes.tables.${tbl}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 min-w-[16rem] flex-col gap-1 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("admin.audit.data_changes.entity_id_label")}
          <Input
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={t("admin.audit.data_changes.entity_id_placeholder")}
            className="h-9 font-mono text-xs font-normal normal-case"
          />
        </label>
        <Button
          onClick={submit}
          disabled={!UUID_RE.test(trimmed)}
          size="sm"
          className="h-9 gap-2"
        >
          <Search className="h-4 w-4" />
          {t("admin.audit.data_changes.lookup")}
        </Button>
      </div>

      {invalid ? (
        <p className="text-xs text-m3-error">
          {t("admin.audit.data_changes.invalid_id")}
        </p>
      ) : null}

      {!submittedId ? (
        <EmptyState text={t("admin.audit.data_changes.hint")} />
      ) : isLoading ? (
        <TableSkeleton />
      ) : notFound ? (
        <EmptyState text={t("admin.audit.data_changes.not_found")} />
      ) : isError ? (
        <EmptyState text={t("admin.audit.load_failed")} error />
      ) : data ? (
        <DataChangeCard row={data} />
      ) : null}
    </div>
  );
}

/** Renders a data-change row as a field/value grid, skipping empty extras. */
function DataChangeCard({
  row,
}: {
  row: Record<string, unknown>;
}) {
  const { t } = useTranslation();
  // Stable field order: known common columns first, then entity-specific.
  const order = [
    "entity_id",
    "title",
    "status",
    "organization_id",
    "created_by",
    "updated_by",
    "deleted_by",
    "created_at",
    "updated_at",
    "deleted_at",
    "slug",
    "material_type",
    "lesson_id",
    "primary_email",
    "scope_kind",
    "subject_user_id",
  ];
  const isTimestamp = (k: string) => k.endsWith("_at");
  const entries = order
    .filter((k) => row[k] !== undefined && row[k] !== null)
    .map((k) => {
      const raw = row[k];
      const value = isTimestamp(k)
        ? new Date(String(raw)).toLocaleString()
        : String(raw);
      return { key: k, value };
    });

  return (
    <div className="overflow-x-auto rounded-xl ghost-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-widest text-m3-on-surface-variant border-b border-m3-outline-variant/20">
            <th className="px-4 py-3">{t("admin.audit.cols.field")}</th>
            <th className="px-4 py-3">{t("admin.audit.cols.value")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ key, value }) => (
            <tr
              key={key}
              className="border-b border-m3-outline-variant/10 last:border-0"
            >
              <td className="px-4 py-2.5 text-m3-on-surface-variant whitespace-nowrap">
                {t(`admin.audit.data_changes.fields.${key}`, { defaultValue: key })}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs break-all">
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleChangesTable({ sinceIso }: { sinceIso: string }) {
  const { t } = useTranslation();
  const { data: rows, isLoading, isError } = useAuditRoleChanges(sinceIso);

  if (isLoading) return <TableSkeleton />;
  if (isError) return <EmptyState text={t("admin.audit.load_failed")} error />;
  if (!rows?.length) return <EmptyState text={t("admin.audit.empty")} />;

  return (
    <div className="overflow-x-auto rounded-xl ghost-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-widest text-m3-on-surface-variant border-b border-m3-outline-variant/20">
            <th className="px-4 py-3">{t("admin.audit.cols.when")}</th>
            <th className="px-4 py-3">{t("admin.audit.cols.role")}</th>
            <th className="px-4 py-3">{t("admin.audit.cols.scope")}</th>
            <th className="px-4 py-3">{t("admin.audit.cols.user")}</th>
            <th className="px-4 py-3">{t("admin.audit.cols.granted_by")}</th>
            <th className="px-4 py-3">{t("admin.audit.cols.status")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.assignment_id}
              className="border-b border-m3-outline-variant/10 last:border-0"
            >
              <td className="px-4 py-2.5 whitespace-nowrap text-m3-on-surface-variant">
                {new Date(row.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-2.5">
                <Badge className="text-[10px] border-0 bg-m3-primary/10 text-m3-primary flex items-center gap-1 w-fit">
                  <ShieldCheck className="h-3 w-3" />
                  {row.role_code}
                </Badge>
              </td>
              <td className="px-4 py-2.5 text-m3-on-surface-variant">{row.scope_kind}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{row.user_id}</td>
              <td className="px-4 py-2.5 font-mono text-xs">
                {row.granted_by ?? t("admin.audit.system")}
              </td>
              <td className="px-4 py-2.5">
                {row.deleted_at ? (
                  <Badge className="text-[10px] border-0 bg-m3-error-container text-m3-on-error-container">
                    {t("admin.audit.revoked")}
                  </Badge>
                ) : (
                  <Badge className="text-[10px] border-0 bg-emerald-100 text-emerald-700">
                    {t("admin.audit.active")}
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HttpAuditTable({ sinceIso }: { sinceIso: string }) {
  const { t } = useTranslation();
  const [pathFilter, setPathFilter] = useState("");
  // Debounce: each request is itself written to the http audit table, so
  // per-keystroke fetching would amplify the very log being inspected.
  const [debouncedPath, setDebouncedPath] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedPath(pathFilter), 400);
    return () => clearTimeout(handle);
  }, [pathFilter]);
  const { data: rows, isLoading, isError } = useAuditHttp(
    sinceIso,
    debouncedPath ? `${debouncedPath}%` : undefined,
  );

  return (
    <div className="space-y-3">
      <Input
        value={pathFilter}
        onChange={(e) => setPathFilter(e.target.value)}
        placeholder={t("admin.audit.path_filter_placeholder")}
        className="max-w-md h-9 font-mono text-xs"
      />
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <EmptyState text={t("admin.audit.load_failed")} error />
      ) : !rows?.length ? (
        <EmptyState text={t("admin.audit.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-xl ghost-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-m3-on-surface-variant border-b border-m3-outline-variant/20">
                <th className="px-4 py-3">{t("admin.audit.cols.when")}</th>
                <th className="px-4 py-3">{t("admin.audit.cols.method")}</th>
                <th className="px-4 py-3">{t("admin.audit.cols.path")}</th>
                <th className="px-4 py-3">{t("admin.audit.cols.code")}</th>
                <th className="px-4 py-3">{t("admin.audit.cols.latency")}</th>
                <th className="px-4 py-3">{t("admin.audit.cols.user")}</th>
                <th className="px-4 py-3">{t("admin.audit.cols.ip")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-m3-outline-variant/10 last:border-0">
                  <td className="px-4 py-2.5 whitespace-nowrap text-m3-on-surface-variant">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs font-bold">{row.method}</td>
                  <td className="px-4 py-2.5 font-mono text-xs max-w-xs truncate">{row.path}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "font-mono text-xs font-bold",
                        row.status_code >= 500
                          ? "text-m3-error"
                          : row.status_code >= 400
                            ? "text-amber-600"
                            : "text-emerald-600",
                      )}
                    >
                      {row.status_code}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-m3-on-surface-variant">
                    {row.latency_ms != null ? `${row.latency_ms} ms` : "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{row.user_id ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{row.ip_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 bg-m3-surface-container animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
      <ScrollText className={`h-8 w-8 mx-auto mb-3 ${error ? "text-m3-error" : "text-m3-outline"}`} />
      <p className={`text-sm ${error ? "text-m3-error" : "text-m3-on-surface-variant"}`}>{text}</p>
    </div>
  );
}
