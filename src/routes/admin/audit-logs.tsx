import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuditHttp, useAuditRoleChanges } from "@/lib/api/hooks/admin";
import { cn } from "@/lib/utils";

type TabKey = "role_changes" | "http";

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
