import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useAuditHttp, useAuditRoleChanges } from "@/lib/api/hooks/admin";
import { cn } from "@/lib/utils";

type TabKey = "role_changes" | "http";

type RoleChangeRow = NonNullable<
  ReturnType<typeof useAuditRoleChanges>["data"]
>[number];
type HttpAuditRow = NonNullable<ReturnType<typeof useAuditHttp>["data"]>[number];

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

      <div className="flex gap-2">
        {(["role_changes", "http"] as TabKey[]).map((key) => (
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
      ) : (
        <HttpAuditTable sinceIso={sinceIso} />
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
      cell: (r) => <span className="text-m3-on-surface-variant">{r.scope_kind}</span>,
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
  const { data: rows, isLoading, isError } = useAuditHttp(
    sinceIso,
    debouncedPath ? `${debouncedPath}%` : undefined,
  );

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
      cell: (r) => <span className="font-mono text-xs font-bold">{r.method}</span>,
    },
    {
      id: "path",
      header: t("admin.audit.cols.path"),
      cell: (r) => (
        <span className="font-mono text-xs max-w-xs truncate block">{r.path}</span>
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
      cell: (r) => <span className="font-mono text-xs">{r.user_id ?? "—"}</span>,
    },
    {
      id: "ip",
      header: t("admin.audit.cols.ip"),
      cell: (r) => <span className="font-mono text-xs">{r.ip_address ?? "—"}</span>,
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

function ErrorPanel({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
      <ScrollText className="h-8 w-8 mx-auto mb-3 text-m3-error" />
      <p className="text-sm text-m3-error">{text}</p>
    </div>
  );
}
