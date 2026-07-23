import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollText, ShieldCheck, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  useAuditHttp,
  useAuditRoleChanges,
  useAuditDataChanges,
} from "@/lib/api/hooks/admin";
import { ApiError } from "@/lib/api/client";
import { DATA_CHANGE_TABLES, type DataChangeTable } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type TabKey = "role_changes" | "http" | "data_changes";

type RoleChangeRow = NonNullable<
  ReturnType<typeof useAuditRoleChanges>["data"]
>[number];
type HttpAuditRow = NonNullable<
  ReturnType<typeof useAuditHttp>["data"]
>[number];

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
            onChange={(e) =>
              setSinceDays(Math.max(1, Number(e.target.value) || 7))
            }
            className="w-20 h-8"
          />
        </label>
      </div>

      <div className="flex gap-2">
        {(["role_changes", "http", "data_changes"] as TabKey[]).map((key) => (
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
      ) : tab === "http" ? (
        <HttpAuditTable sinceIso={sinceIso} />
      ) : (
        <DataChangesPanel />
      )}
    </div>
  );
}

function RoleChangesTable({ sinceIso }: { sinceIso: string }) {
  const { t } = useTranslation();
  const { data: rows, isLoading, isError } = useAuditRoleChanges(sinceIso);

  if (isError) return <ErrorPanel text={t("admin.audit.load_failed")} />;

  const columns: DataTableColumn<RoleChangeRow>[] = [
    {
      id: "when",
      header: t("admin.audit.cols.when"),
      cell: (r) => (
        <span className="whitespace-nowrap text-m3-on-surface-variant">
          {new Date(r.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: "role",
      header: t("admin.audit.cols.role"),
      cell: (r) => (
        <Badge className="text-[10px] border-0 bg-m3-primary/10 text-m3-primary flex items-center gap-1 w-fit">
          <ShieldCheck className="h-3 w-3" />
          {r.role_code}
        </Badge>
      ),
    },
    {
      id: "scope",
      header: t("admin.audit.cols.scope"),
      cell: (r) => (
        <span className="text-m3-on-surface-variant">{r.scope_kind}</span>
      ),
    },
    {
      id: "user",
      header: t("admin.audit.cols.user"),
      cell: (r) => <span className="font-mono text-xs">{r.user_id}</span>,
    },
    {
      id: "granted_by",
      header: t("admin.audit.cols.granted_by"),
      cell: (r) => (
        <span className="font-mono text-xs">
          {r.granted_by ?? t("admin.audit.system")}
        </span>
      ),
    },
    {
      id: "status",
      header: t("admin.audit.cols.status"),
      cell: (r) =>
        r.deleted_at ? (
          <Badge className="text-[10px] border-0 bg-m3-error-container text-m3-on-error-container">
            {t("admin.audit.revoked")}
          </Badge>
        ) : (
          <Badge className="text-[10px] border-0 bg-emerald-100 text-emerald-700">
            {t("admin.audit.active")}
          </Badge>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows ?? []}
      getRowId={(r) => r.assignment_id}
      loading={isLoading}
      pagination
      pageSize={15}
      pageSizeOptions={[15, 30, 50]}
      emptyState={t("admin.audit.empty")}
    />
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
  const {
    data: rows,
    isLoading,
    isError,
  } = useAuditHttp(sinceIso, debouncedPath ? `${debouncedPath}%` : undefined);

  const columns: DataTableColumn<HttpAuditRow>[] = [
    {
      id: "when",
      header: t("admin.audit.cols.when"),
      cell: (r) => (
        <span className="whitespace-nowrap text-m3-on-surface-variant">
          {new Date(r.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: "method",
      header: t("admin.audit.cols.method"),
      cell: (r) => (
        <span className="font-mono text-xs font-bold">{r.method}</span>
      ),
    },
    {
      id: "path",
      header: t("admin.audit.cols.path"),
      cell: (r) => (
        <span className="font-mono text-xs max-w-xs truncate block">
          {r.path}
        </span>
      ),
    },
    {
      id: "code",
      header: t("admin.audit.cols.code"),
      cell: (r) => (
        <span
          className={cn(
            "font-mono text-xs font-bold",
            r.status_code >= 500
              ? "text-m3-error"
              : r.status_code >= 400
                ? "text-amber-600"
                : "text-emerald-600",
          )}
        >
          {r.status_code}
        </span>
      ),
    },
    {
      id: "latency",
      header: t("admin.audit.cols.latency"),
      cell: (r) => (
        <span className="text-m3-on-surface-variant">
          {r.latency_ms != null ? `${r.latency_ms} ms` : "—"}
        </span>
      ),
    },
    {
      id: "user",
      header: t("admin.audit.cols.user"),
      cell: (r) => (
        <span className="font-mono text-xs">{r.user_id ?? "—"}</span>
      ),
    },
    {
      id: "ip",
      header: t("admin.audit.cols.ip"),
      cell: (r) => (
        <span className="font-mono text-xs">{r.ip_address ?? "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Input
        value={pathFilter}
        onChange={(e) => setPathFilter(e.target.value)}
        placeholder={t("admin.audit.path_filter_placeholder")}
        className="max-w-md h-9 font-mono text-xs"
      />
      {isError ? (
        <ErrorPanel text={t("admin.audit.load_failed")} />
      ) : (
        <DataTable
          columns={columns}
          data={rows ?? []}
          getRowId={(r) => r.id}
          loading={isLoading}
          pagination
          pageSize={15}
          pageSizeOptions={[15, 30, 50]}
          emptyState={t("admin.audit.empty")}
        />
      )}
    </div>
  );
}

/** FR-6.7 — on-demand lookup: pick an entity type, paste its UUID, see
 * who created / updated / deleted it. Fires only once the ID looks like
 * a well-formed UUID, so the query doesn't hammer the endpoint per
 * keystroke.
 */
function DataChangesPanel() {
  const { t } = useTranslation();
  const [table, setTable] = useState<DataChangeTable>("courses");
  const [entityIdInput, setEntityIdInput] = useState("");
  const [submittedId, setSubmittedId] = useState("");

  const trimmed = entityIdInput.trim();
  const isValidUuid = trimmed.length === 0 || UUID_RE.test(trimmed);

  const {
    data: row,
    isFetching,
    isError,
    error,
  } = useAuditDataChanges(table, submittedId);

  const submit = () => {
    if (UUID_RE.test(trimmed)) setSubmittedId(trimmed);
  };

  const fields: Array<keyof NonNullable<typeof row>> = [
    "entity_id",
    "title",
    "status",
    "organization_id",
    "created_by",
    "created_at",
    "updated_by",
    "updated_at",
    "deleted_by",
    "deleted_at",
    "slug",
    "material_type",
    "lesson_id",
    "primary_email",
    "scope_kind",
    "subject_user_id",
  ];

  const isNotFound =
    isError && error instanceof ApiError && error.status === 404;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant flex flex-col gap-1">
          {t("admin.audit.data_changes.table_label")}
          <select
            value={table}
            onChange={(e) => {
              setTable(e.target.value as DataChangeTable);
              setSubmittedId("");
            }}
            className="h-9 rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-3 text-sm font-normal normal-case"
          >
            {DATA_CHANGE_TABLES.map((tbl) => (
              <option key={tbl} value={tbl}>
                {t(`admin.audit.data_changes.tables.${tbl}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant flex flex-col gap-1 flex-1 min-w-[280px]">
          {t("admin.audit.data_changes.entity_id_label")}
          <Input
            value={entityIdInput}
            onChange={(e) => setEntityIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={t("admin.audit.data_changes.entity_id_placeholder")}
            className="h-9 font-mono text-xs normal-case"
          />
        </label>
        <Button
          onClick={submit}
          disabled={!trimmed || !isValidUuid}
          className="h-9 gap-2"
        >
          <Search className="h-4 w-4" />
          {t("admin.audit.data_changes.lookup")}
        </Button>
      </div>

      {!isValidUuid ? (
        <p className="text-sm text-m3-error">
          {t("admin.audit.data_changes.invalid_id")}
        </p>
      ) : !submittedId ? (
        <p className="text-sm text-m3-on-surface-variant">
          {t("admin.audit.data_changes.hint")}
        </p>
      ) : isFetching ? (
        <p className="text-sm text-m3-on-surface-variant">…</p>
      ) : isNotFound ? (
        <ErrorPanel text={t("admin.audit.data_changes.not_found")} />
      ) : isError ? (
        <ErrorPanel text={t("admin.audit.load_failed")} />
      ) : row ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-m3-surface-container-lowest ghost-border p-4">
          {fields
            .filter((f) => row[f] !== undefined && row[f] !== null)
            .map((f) => (
              <div key={f} className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t(`admin.audit.data_changes.fields.${f}`)}
                </dt>
                <dd className="text-sm font-mono break-all">
                  {String(row[f])}
                </dd>
              </div>
            ))}
        </dl>
      ) : null}
    </div>
  );
}

function ErrorPanel({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
      <ScrollText className="h-8 w-8 mx-auto mb-3 text-m3-error" />
      <p className="text-sm text-m3-error">{text}</p>
    </div>
  );
}
