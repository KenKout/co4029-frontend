import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Copy, Mail, ScrollText, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  type FilterDef,
} from "@/components/ui/data-table-toolbar";
import { Tabs } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import {
  useAuditDataChangesList,
  useAuditHttp,
  useAuditRoleChanges,
  useUsersByIds,
} from "@/lib/api/hooks/admin";
import { DATA_CHANGE_TABLES, type DataChangeTable } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ROLE_BADGE_COLOR } from "./_components/users/constants";

type TabKey = "role_changes" | "http" | "data_changes";

/** Tab order for the strip. Same three sources as before, as data. */
const TAB_KEYS: TabKey[] = ["role_changes", "http", "data_changes"];

/** Narrow an untrusted `?tab=` value. A bad link falls back to the default
 *  tab rather than rendering an empty one. */
function isAuditTab(value: unknown): value is TabKey {
  return (
    value === "role_changes" || value === "http" || value === "data_changes"
  );
}

type RoleChangeRow = NonNullable<
  ReturnType<typeof useAuditRoleChanges>["data"]
>[number];
type HttpAuditRow = NonNullable<
  ReturnType<typeof useAuditHttp>["data"]
>[number] & { failure_reason?: string | null };
type DataChangeRow = NonNullable<
  ReturnType<typeof useAuditDataChangesList>["data"]
>[number];
type AuditUser = NonNullable<ReturnType<typeof useUsersByIds>["data"]>[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

import { DateRangePicker } from "./_components/stats/DateRangePicker";
import {
  fromIso,
  rangePresets,
  type RangeSelection,
} from "./_components/stats/date-range";

/** Fr-6.7 — admin viewer over the immutable audit endpoints. */
export default function AdminAuditLogsPage() {
  const { t } = useTranslation();
  // ?tab= / ?path= let a dashboard alert land on the rows behind it. Anything
  // unrecognised falls back to the default tab rather than showing an empty
  // one — a bad link should still leave the operator somewhere useful.
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>(() =>
    isAuditTab(search.tab) ? search.tab : "role_changes",
  );
  // Date range over the audit trail, same picker as the dashboard: from/to are
  // calendar days (local), `to` is INCLUSIVE — the API upper bound becomes
  // to+1 day at local midnight, exactly like the dashboard window.
  const [range, setRange] = useState<RangeSelection>(
    () => rangePresets(new Date()).last7,
  );
  const sinceIso = useMemo(
    () => new Date(`${range.from}T00:00:00`).toISOString(),
    [range.from],
  );
  const untilIso = useMemo(() => {
    if (!range.to) return undefined;
    const end = fromIso(range.to);
    end.setDate(end.getDate() + 1);
    return end.toISOString();
  }, [range.to]);

  const selectTab = (next: TabKey) => {
    setTab(next);
    void navigate({
      to: "/admin/audit-logs",
      search: { tab: next },
      replace: true,
    });
  };

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
        <DateRangePicker range={range} onChange={setRange} />
      </div>

      <Tabs
        tabs={TAB_KEYS.map((key) => ({
          key,
          label: t(`admin.audit.tabs.${key}`),
        }))}
        value={tab}
        onChange={selectTab}
        variant="contained"
        ariaLabel={t("admin.audit.title")}
      />

      {tab === "role_changes" ? (
        <RoleChangesTable sinceIso={sinceIso} untilIso={untilIso} />
      ) : tab === "http" ? (
        <HttpAuditTable
          sinceIso={sinceIso}
          untilIso={untilIso}
          initialPath={search.path}
          initialEvent={
            search.event === "login_failure" || search.event === "denied"
              ? search.event
              : undefined
          }
          requestId={
            typeof search.request_id === "string"
              ? search.request_id
              : undefined
          }
        />
      ) : (
        <DataChangesPanel sinceIso={sinceIso} untilIso={untilIso} />
      )}
    </div>
  );
}

/** Shared user-identity cell: avatar + display name + email + copy UUID. */
function UserIdentityCell({
  userId,
  users,
  systemLabel,
}: {
  userId: string | null | undefined;
  users: AuditUser[] | undefined;
  systemLabel: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!userId) {
    return (
      <span className="text-m3-on-surface-variant italic">{systemLabel}</span>
    );
  }

  const user = users?.find((u) => u.id === userId);
  const displayName = user?.profile?.display_name?.trim() || userId;

  const copyId = () => {
    void navigator.clipboard.writeText(userId).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => toast.error(t("admin.audit.copy_failed")),
    );
  };

  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar size="sm" className={avatarColor(userId)}>
        {user?.profile?.avatar_url && (
          <AvatarImage src={user.profile.avatar_url} alt={displayName} />
        )}
        <AvatarFallback>
          {avatarInitials(displayName, { uppercase: true })}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-strong truncate">
          {displayName}
        </p>
        {user ? (
          <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{user.primary_email}</span>
          </p>
        ) : (
          <p className="text-xs font-mono text-text-muted flex items-center gap-1 mt-0.5">
            <span className="truncate">{userId}</span>
            <Tooltip
              content={
                copied ? t("admin.audit.copied") : t("admin.audit.copy_id")
              }
            >
              <Button
                type="button"
                variant="ghost"
                aria-label={t("admin.audit.copy_id")}
                onClick={copyId}
                className="h-4 w-4 shrink-0 rounded p-0 hover:bg-transparent text-m3-on-surface-variant"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </Tooltip>
          </p>
        )}
      </div>
    </div>
  );
}

function RoleChangesTable({
  sinceIso,
  untilIso,
}: {
  sinceIso: string;
  untilIso?: string;
}) {
  const { t } = useTranslation();
  const {
    data: rows,
    isLoading,
    isError,
  } = useAuditRoleChanges(sinceIso, untilIso);
  const userIds = useMemo(
    () =>
      (rows ?? []).flatMap((r) =>
        [r.user_id, r.granted_by].filter((v): v is string => Boolean(v)),
      ),
    [rows],
  );
  const { data: users } = useUsersByIds(userIds);

  if (isError) return <ErrorPanel text={t("admin.audit.load_failed")} />;

  const columns: DataTableColumn<RoleChangeRow>[] = [
    {
      id: "when",
      header: t("admin.audit.cols.when"),
      sortable: true,
      sortValue: (r) => new Date(r.created_at),
      cell: (r) => (
        <span className="whitespace-nowrap text-m3-on-surface-variant">
          {new Date(r.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: "role",
      header: t("admin.audit.cols.role"),
      sortable: true,
      sortValue: (r) => r.role_code,
      cell: (r) => (
        <span
          className={cn(
            "inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md flex items-center gap-1 w-fit",
            ROLE_BADGE_COLOR[r.role_code] ?? "bg-slate-100 text-slate-700",
          )}
        >
          <ShieldCheck className="h-3 w-3" />
          {r.role_code}
        </span>
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
      cell: (r) => (
        <UserIdentityCell
          userId={r.user_id}
          users={users}
          systemLabel={t("admin.audit.system")}
        />
      ),
    },
    {
      id: "granted_by",
      header: t("admin.audit.cols.granted_by"),
      cell: (r) => (
        <UserIdentityCell
          userId={r.granted_by}
          users={users}
          systemLabel={t("admin.audit.system")}
        />
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

function HttpAuditTable({
  sinceIso,
  untilIso,
  initialPath,
  initialEvent,
  requestId,
}: {
  sinceIso: string;
  untilIso?: string;
  /** Seeded from ?path= so a security alert opens on its own requests. */
  initialPath?: string;
  initialEvent?: "login_failure" | "denied";
  requestId?: string;
}) {
  const { t } = useTranslation();
  const [pathFilter, setPathFilter] = useState(initialPath ?? "");
  // Debounce: each request is itself written to the http audit table, so
  // per-keystroke fetching would amplify the very log being inspected. The
  // seeded value skips the debounce — the operator already asked for it.
  const [debouncedPath, setDebouncedPath] = useState(initialPath ?? "");
  const [methodFilter, setMethodFilter] = useState<string | undefined>();
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedPath(pathFilter), 400);
    return () => clearTimeout(handle);
  }, [pathFilter]);
  const {
    data: rows,
    isLoading,
    isError,
  } = useAuditHttp(
    sinceIso,
    untilIso,
    debouncedPath ? `${debouncedPath}%` : undefined,
    undefined,
    initialEvent,
    requestId,
  );

  const filtered = useMemo(() => {
    const base = rows ?? [];
    if (!methodFilter) return base;
    return base.filter((r) => r.method === methodFilter);
  }, [rows, methodFilter]);

  const userIds = useMemo(
    () => (filtered ?? []).flatMap((r) => (r.user_id ? [r.user_id] : [])),
    [filtered],
  );
  const { data: users } = useUsersByIds(userIds);

  const methodFilterDef: FilterDef = {
    id: "method",
    label: t("admin.audit.cols.method"),
    allLabel: t("admin.audit.all_methods"),
    options: ["GET", "POST", "PATCH", "PUT", "DELETE"].map((m) => ({
      value: m,
      label: m,
    })),
  };

  const columns: DataTableColumn<HttpAuditRow>[] = [
    {
      id: "when",
      header: t("admin.audit.cols.when"),
      sortable: true,
      sortValue: (r) => new Date(r.created_at),
      cell: (r) => (
        <span className="whitespace-nowrap text-m3-on-surface-variant">
          {new Date(r.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: "method",
      header: t("admin.audit.cols.method"),
      sortable: true,
      sortValue: (r) => r.method,
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
      sortable: true,
      sortValue: (r) => r.status_code,
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
      sortable: true,
      sortValue: (r) => r.latency_ms ?? 0,
      cell: (r) => (
        <span className="text-m3-on-surface-variant">
          {r.latency_ms != null ? `${r.latency_ms} ms` : "—"}
        </span>
      ),
    },
    {
      id: "reason",
      header: t("admin.audit.cols.reason"),
      cell: (r) => (
        <span className="text-xs text-text-muted">
          {r.failure_reason
            ? t(`admin.audit.failure_reasons.${r.failure_reason}`)
            : "—"}
        </span>
      ),
    },
    {
      id: "user",
      header: t("admin.audit.cols.user"),
      cell: (r) => (
        <UserIdentityCell
          userId={r.user_id}
          users={users}
          systemLabel={t("admin.audit.system")}
        />
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
      <DataTableToolbar
        search={pathFilter}
        onSearchChange={setPathFilter}
        searchPlaceholder={t("admin.audit.path_filter_placeholder")}
        filters={[methodFilterDef]}
        filterValues={{ method: methodFilter }}
        onFilterChange={(filterId, value) => {
          if (filterId === "method") setMethodFilter(value);
        }}
      />
      {isError ? (
        <ErrorPanel text={t("admin.audit.load_failed")} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
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

/** FR-6.7 — recent data changes per entity kind, with drill-down detail. */
/** Entity-ID lookup input + button (DataChangesPanel toolbar). */
function EntityIdLookup({
  value,
  onChange,
  isValidUuid,
  onLookup,
}: {
  value: string;
  onChange: (value: string) => void;
  isValidUuid: boolean;
  onLookup: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && isValidUuid && value.trim()) {
            onLookup(value.trim());
          }
        }}
        placeholder={t("admin.audit.data_changes.entity_id_placeholder")}
        className="h-9 w-64 font-mono text-xs normal-case"
      />
      <Button
        type="button"
        onClick={() => {
          if (isValidUuid && value.trim()) onLookup(value.trim());
        }}
        disabled={!value.trim() || !isValidUuid}
        className="h-9 gap-2"
      >
        <UserRound className="h-4 w-4" />
        {t("admin.audit.data_changes.lookup")}
      </Button>
    </div>
  );
}

function DataChangesPanel({
  sinceIso,
  untilIso,
}: {
  sinceIso: string;
  untilIso?: string;
}) {
  const { t } = useTranslation();
  const [table, setTable] = useState<DataChangeTable>("courses");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [entityIdInput, setEntityIdInput] = useState("");
  const {
    data: rows,
    isLoading,
    isError,
  } = useAuditDataChangesList(table, sinceIso, untilIso);

  const trimmed = entityIdInput.trim();
  const isValidUuid = trimmed.length === 0 || UUID_RE.test(trimmed);

  const actorIds = useMemo(
    () =>
      (rows ?? []).flatMap((r) =>
        [r.created_by, r.updated_by, r.deleted_by].filter((v): v is string =>
          Boolean(v),
        ),
      ),
    [rows],
  );
  const { data: users } = useUsersByIds(actorIds);

  const detail = selectedId
    ? (rows ?? []).find((r) => r.entity_id === selectedId)
    : undefined;

  const columns: DataTableColumn<DataChangeRow>[] = [
    {
      id: "entity",
      header: t("admin.audit.cols.entity"),
      sortable: true,
      sortValue: (r) => r.title,
      cell: (r) => (
        <span className="text-sm font-medium text-text-strong truncate max-w-[16rem] block">
          {r.title}
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
    {
      id: "updated_at",
      header: t("admin.audit.cols.updated_at"),
      sortable: true,
      sortValue: (r) => new Date(r.updated_at),
      cell: (r) => (
        <span className="whitespace-nowrap text-m3-on-surface-variant">
          {new Date(r.updated_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: "updated_by",
      header: t("admin.audit.cols.updated_by"),
      cell: (r) => (
        <UserIdentityCell
          userId={r.updated_by ?? r.created_by}
          users={users}
          systemLabel={t("admin.audit.system")}
        />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <DataTableToolbar
        filters={[
          {
            id: "table",
            label: t("admin.audit.data_changes.table_label"),
            allLabel: undefined,
            options: DATA_CHANGE_TABLES.map((tbl) => ({
              value: tbl,
              label: t(`admin.audit.data_changes.tables.${tbl}`),
            })),
          },
        ]}
        filterValues={{ table }}
        onFilterChange={(filterId, value) => {
          if (filterId === "table" && value) {
            setTable(value as DataChangeTable);
            setSelectedId(undefined);
          }
        }}
        trailing={
          <EntityIdLookup
            value={entityIdInput}
            onChange={setEntityIdInput}
            isValidUuid={isValidUuid}
            onLookup={setSelectedId}
          />
        }
      />

      {!isValidUuid && trimmed ? (
        <p className="text-sm text-m3-error">
          {t("admin.audit.data_changes.invalid_id")}
        </p>
      ) : null}

      {isError ? (
        <ErrorPanel text={t("admin.audit.load_failed")} />
      ) : (
        <DataTable
          columns={columns}
          data={rows ?? []}
          getRowId={(r) => r.entity_id}
          loading={isLoading}
          pagination
          pageSize={15}
          pageSizeOptions={[15, 30, 50]}
          emptyState={t("admin.audit.empty")}
          onRowClick={(r) =>
            setSelectedId((prev) =>
              prev === r.entity_id ? undefined : r.entity_id,
            )
          }
        />
      )}

      {detail && (
        <DataChangeDetail
          row={detail}
          onClose={() => setSelectedId(undefined)}
        />
      )}
    </div>
  );
}

const DETAIL_FIELDS: Array<keyof DataChangeRow> = [
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

function DataChangeDetail({
  row,
  onClose,
}: {
  row: DataChangeRow;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-text-strong truncate">
          {row.title}
        </h3>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="h-8 px-2 text-xs"
        >
          {t("common.close")}
        </Button>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DETAIL_FIELDS.filter(
          (f) => row[f] !== undefined && row[f] !== null,
        ).map((f) => (
          <div key={f} className="flex flex-col gap-0.5">
            <dt className="text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t(`admin.audit.data_changes.fields.${f}`)}
            </dt>
            <dd className="text-sm font-mono break-all">{String(row[f])}</dd>
          </div>
        ))}
      </dl>
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
