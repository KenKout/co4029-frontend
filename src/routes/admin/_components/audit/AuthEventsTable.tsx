import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  DataTableToolbar,
  type FilterDef,
} from "@/components/ui/data-table-toolbar";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuditAuthEvents, useUsersByIds } from "@/lib/api/hooks/admin";
import { cn } from "@/lib/utils";
import { ErrorPanel, UserIdentityCell } from "./AuditCells";

type AuthEventRow = NonNullable<
  ReturnType<typeof useAuditAuthEvents>["data"]
>[number];

/** Same shape as the page's own guard — an account id is only sent when it
 *  is a well-formed uuid. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The frozen v1 auth-event registry, mirroring ``AUTH_EVENT_TYPES`` in
 *  identity/services/auth_events.py and the ck_auth_events_event_type CHECK.
 *  Listed rather than derived from the rows so the filter offers every kind
 *  the backend can write, including ones that have not occurred yet in the
 *  selected window. */
const AUTH_EVENT_TYPES = [
  "login_succeeded",
  "login_failed",
  "logout",
  "mfa_enrolled",
  "mfa_enrollment_verified",
  "mfa_challenge_created",
  "mfa_verified",
  "mfa_verification_failed",
  "mfa_disabled",
  "recovery_codes_regenerated",
  "account_status_changed",
  "role_assigned",
  "role_revoked",
] as const;

/** Badge tone by what the event MEANS to someone scanning the list, not by
 *  which service wrote it: green succeeded, red failed, amber weakened or
 *  changed someone's access, slate routine. */
const AUTH_EVENT_TONE: Record<string, string> = {
  login_succeeded: "bg-emerald-100 text-emerald-800",
  mfa_verified: "bg-emerald-100 text-emerald-800",
  mfa_enrolled: "bg-emerald-100 text-emerald-800",
  mfa_enrollment_verified: "bg-emerald-100 text-emerald-800",
  role_assigned: "bg-emerald-100 text-emerald-800",
  login_failed: "bg-red-100 text-red-800",
  mfa_verification_failed: "bg-red-100 text-red-800",
  mfa_disabled: "bg-amber-100 text-amber-800",
  account_status_changed: "bg-amber-100 text-amber-800",
  role_revoked: "bg-amber-100 text-amber-800",
};

/** `detail` is a redacted JSONB bag (reason codes, provider, scope kinds —
 *  never codes or tokens). Dumping it raw reads as debug output, so the keys
 *  the recorders actually write get a chip each and anything else is counted
 *  rather than hidden: a key added backend-side still shows that it exists. */
const DETAIL_KEYS = [
  "reason",
  "provider",
  "method",
  "action",
  "from",
  "to",
  "role_code",
  "scope_kind",
] as const;

function DetailChips({ detail }: { detail: Record<string, unknown> }) {
  const { t } = useTranslation();
  const known = DETAIL_KEYS.filter((k) => detail[k] != null);
  const extra = Object.keys(detail).filter(
    (k) => !(DETAIL_KEYS as readonly string[]).includes(k),
  );
  if (known.length === 0 && extra.length === 0) {
    return <span className="text-m3-on-surface-variant">—</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {known.map((k) => (
        <span
          key={k}
          className="rounded-md bg-m3-surface-container px-1.5 py-0.5 text-[11px] text-m3-on-surface-variant"
        >
          <span className="opacity-60">{k}: </span>
          <span className="font-mono">{String(detail[k])}</span>
        </span>
      ))}
      {extra.length > 0 ? (
        <Tooltip content={extra.join(", ")}>
          <span className="rounded-md bg-m3-surface-container px-1.5 py-0.5 text-[11px] text-m3-on-surface-variant">
            {t("admin.audit.auth_events.more_detail", { count: extra.length })}
          </span>
        </Tooltip>
      ) : null}
    </div>
  );
}

/** FR-1.6 — typed authentication / access-control events.
 *
 * The semantic counterpart of the HTTP tab: that one says
 * "POST /auth/mfa/verify -> 204", this one says `mfa_verified`. */
export function AuthEventsTable({
  sinceIso,
  untilIso,
}: {
  sinceIso: string;
  untilIso?: string;
}) {
  const { t } = useTranslation();
  const [eventType, setEventType] = useState<string | undefined>();
  const [userQuery, setUserQuery] = useState("");
  // Only a well-formed uuid is sent. A half-typed one would narrow the feed
  // to nothing and read as "this account has no auth activity".
  const userId = UUID_RE.test(userQuery.trim()) ? userQuery.trim() : undefined;

  const {
    data: rows,
    isLoading,
    isError,
  } = useAuditAuthEvents(sinceIso, untilIso, eventType, userId);

  // Both identity columns resolve from one lookup — an admin acting on
  // someone else is the actor here and the subject elsewhere.
  const userIds = useMemo(
    () =>
      (rows ?? []).flatMap((r) =>
        [r.user_id, r.actor_user_id].filter((v): v is string => Boolean(v)),
      ),
    [rows],
  );
  const { data: users } = useUsersByIds(userIds);

  const typeFilterDef: FilterDef = {
    id: "event_type",
    label: t("admin.audit.auth_events.event"),
    allLabel: t("admin.audit.auth_events.all_events"),
    options: AUTH_EVENT_TYPES.map((value) => ({
      value,
      label: t(`admin.audit.auth_events.types.${value}`),
    })),
  };

  const columns: DataTableColumn<AuthEventRow>[] = [
    {
      id: "when",
      header: t("admin.audit.cols.when"),
      sortable: true,
      sortValue: (r) => new Date(r.occurred_at),
      cell: (r) => (
        <span className="whitespace-nowrap text-m3-on-surface-variant">
          {new Date(r.occurred_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: "event",
      header: t("admin.audit.auth_events.event"),
      sortable: true,
      sortValue: (r) => r.event_type,
      cell: (r) => (
        <span
          className={cn(
            "inline-block w-fit rounded-md px-2 py-0.5 text-[11px] font-semibold",
            AUTH_EVENT_TONE[r.event_type] ?? "bg-slate-100 text-slate-700",
          )}
        >
          {t(`admin.audit.auth_events.types.${r.event_type}`, {
            defaultValue: r.event_type,
          })}
        </span>
      ),
    },
    {
      id: "subject",
      header: t("admin.audit.auth_events.subject"),
      cell: (r) => (
        <UserIdentityCell
          userId={r.user_id}
          users={users}
          systemLabel={t("admin.audit.system")}
        />
      ),
    },
    {
      id: "actor",
      header: t("admin.audit.auth_events.actor"),
      cell: (r) =>
        // A null actor is the normal case for login/logout/MFA: the subject
        // acted on their own account. Only role and status changes name a
        // second person, so "self" is more honest here than "system".
        r.actor_user_id ? (
          <UserIdentityCell
            userId={r.actor_user_id}
            users={users}
            systemLabel={t("admin.audit.system")}
          />
        ) : (
          <span className="italic text-m3-on-surface-variant">
            {t("admin.audit.auth_events.self")}
          </span>
        ),
    },
    {
      id: "detail",
      header: t("admin.audit.auth_events.detail"),
      // `detail` is required in the schema, so no fallback and no cast:
      // the generated type is already Record<string, unknown>.
      cell: (r) => <DetailChips detail={r.detail} />,
    },
  ];

  return (
    <div className="space-y-3">
      <DataTableToolbar
        search={userQuery}
        onSearchChange={setUserQuery}
        searchPlaceholder={t("admin.audit.auth_events.user_filter_placeholder")}
        filters={[typeFilterDef]}
        filterValues={{ event_type: eventType }}
        onFilterChange={(filterId, value) => {
          if (filterId === "event_type") setEventType(value);
        }}
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
