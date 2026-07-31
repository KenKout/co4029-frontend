import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Mail,
  Plus,
  ShieldOff,
  Trash2,
  UserCircle,
} from "lucide-react";
import {
  useAdminUser,
  useDisableUser,
  useEnableUser,
  useGrantUserAssignment,
  useListRoles,
  useRevokeUserAssignment,
} from "@/lib/api/hooks/admin";
import {
  useOrganizations,
  useOrgUnits,
} from "@/lib/api/hooks/admin-organizations";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { formatDateTime, resolveLocale } from "@/lib/format/date";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/components/ui/use-confirm";
import { Skeleton } from "@/components/ui/skeleton";
import { UserStatusBadgeMd as StatusBadge } from "@/components/ui/status-badges";
import type { RoleAssignmentRead } from "@/lib/api/types";

// The backend admin user-detail endpoint enriches each assignment with
// human-readable labels (role/org/unit/course names) after the committed
// OpenAPI snapshot. Widen the generated type locally so the UI can show names
// instead of raw UUIDs, falling back to the id when a label is absent.
type EnrichedAssignment = RoleAssignmentRead & {
  role_code?: string | null;
  role_name?: string | null;
  organization_name?: string | null;
  org_unit_name?: string | null;
  course_title?: string | null;
  assignment_id?: string;
};

// Thin wrapper over the shared date/time formatter; call sites pass the raw
// i18n language, resolveLocale maps it to BCP-47. Same short date+time output.
function formatDate(iso: string | null | undefined, language: string): string {
  return formatDateTime(iso, resolveLocale(language));
}

function ConfirmDisableDialog({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface-elev border border-border rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-headline font-bold text-text-strong">
              {t("admin.users.confirm_disable.title")}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              {t("admin.users.confirm_disable.body")}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-3 py-1.5 text-sm font-medium rounded-md text-text-strong border border-border hover:bg-surface-muted disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-3 py-1.5 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending
              ? t("admin.users.actions.disabling")
              : t("admin.users.actions.disable")}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleAssignmentsSection({
  userId,
  assignments,
}: {
  userId: string;
  assignments: RoleAssignmentRead[];
}) {
  const { t } = useTranslation();
  const roles = useListRoles();
  const grant = useGrantUserAssignment(userId);
  const revoke = useRevokeUserAssignment(userId);
  const { confirm: confirmRevoke, dialog: confirmDialog } = useConfirm({
    title: t("admin.users.roles.revoke"),
    confirmLabel: t("admin.users.roles.revoke"),
    cancelLabel: t("common.cancel"),
  });

  const [roleCode, setRoleCode] = useState<string>("");
  const [scopeKind, setScopeKind] = useState<string>("organization");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [orgUnitId, setOrgUnitId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");

  // Organization + org-unit pickers for the assign-new-role form (replacing
  // raw UUID text inputs). Units load for the chosen org; changing the org
  // resets the selected unit so a stale cross-org unit can't be submitted.
  const orgs = useOrganizations({ limit: 200 });
  const orgOptions = orgs.items ?? [];
  const orgUnits = useOrgUnits(organizationId || undefined);
  const orgUnitOptions = orgUnits.data ?? [];

  useEffect(() => {
    setOrgUnitId("");
  }, [organizationId]);

  const roleOptions = useMemo(
    () => (roles.data ?? []).map((r) => r.role),
    [roles.data],
  );
  const roleByCode = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of roleOptions) m[r.id] = r.code;
    return m;
  }, [roleOptions]);

  // Grant is valid only when a role is chosen and the scope's required target
  // is filled. Used to disable the submit button instead of surfacing a toast
  // after the click — the user sees up front what's still needed.
  const isGrantValid = useMemo(() => {
    if (!roleCode) return false;
    if (scopeKind === "organization") return Boolean(organizationId.trim());
    if (scopeKind === "org_unit") return Boolean(orgUnitId.trim());
    if (scopeKind === "course") return Boolean(courseId.trim());
    return true; // global scope needs no target
  }, [roleCode, scopeKind, organizationId, orgUnitId, courseId]);

  const handleGrant = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // The submit button is disabled until the form is valid, so this is a
    // belt-and-suspenders guard (e.g. Enter-key submit) — no toast needed.
    if (!isGrantValid) return;
    grant.mutate(
      {
        role_code: roleCode,
        scope_kind: scopeKind as
          | "global"
          | "organization"
          | "org_unit"
          | "course",
        organization_id: organizationId.trim() || null,
        org_unit_id: orgUnitId.trim() || null,
        course_id: courseId.trim() || null,
        active_until: null,
      },
      {
        onSuccess: () => {
          toast.success(
            t("admin.users.roles.success.granted", { role: roleCode }),
          );
          setRoleCode("");
          setOrganizationId("");
          setOrgUnitId("");
          setCourseId("");
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("admin.users.roles.errors.grant_failed"),
          ),
      },
    );
  };

  return (
    <div className="bg-surface-elev border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-headline font-bold text-text-strong">
          {t("admin.users.roles.title")}
        </h2>
        <span className="text-xs text-text-muted">
          {t("admin.users.roles.count", { count: assignments.length })}
        </span>
      </div>

      {assignments.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          {t("admin.users.roles.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {(assignments as EnrichedAssignment[]).map((a) => {
            const assignmentId = a.id ?? a.assignment_id ?? "";
            // Prefer server-resolved names; fall back to catalog lookup, then id.
            const roleName =
              a.role_name ??
              roleOptions.find((r) => r.id === a.role_id)?.name ??
              roleByCode[a.role_id] ??
              a.role_code ??
              a.role_id;
            // Scope description in plain language: "Organization · Acme" etc.,
            // mapping each scope FK to its resolved entity name (never a UUID).
            const scopeLabel = t(`admin.users.roles.scope_${a.scope_kind}`, {
              defaultValue: a.scope_kind,
            });
            const scopeTarget =
              a.scope_kind === "organization"
                ? (a.organization_name ?? a.organization_id)
                : a.scope_kind === "org_unit"
                  ? (a.org_unit_name ?? a.org_unit_id)
                  : a.scope_kind === "course"
                    ? (a.course_title ?? a.course_id)
                    : null;
            return (
              <li key={assignmentId} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-strong">
                    {roleName}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {scopeLabel}
                    {scopeTarget ? (
                      <>
                        {" · "}
                        <span className="font-medium text-text-strong">
                          {scopeTarget}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void confirmRevoke({
                      description: t("admin.users.roles.revoke_confirm", {
                        role: roleName,
                      }),
                    }).then((ok) => {
                      if (!ok) return;
                      revoke.mutate(assignmentId, {
                        onSuccess: () =>
                          toast.success(t("admin.users.roles.success.revoked")),
                        onError: (err) =>
                          toast.error(
                            (err as Error).message ||
                              t("admin.users.roles.errors.revoke_failed"),
                          ),
                      });
                    });
                  }}
                  disabled={revoke.isPending}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("admin.users.roles.revoke")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={handleGrant}
        className="mt-4 pt-4 border-t border-border space-y-3"
      >
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          {t("admin.users.roles.assign_new")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs text-text-muted">
            {t("admin.users.roles.role")}
            <Select
              value={roleCode}
              onValueChange={(next) => setRoleCode(next)}
              options={[
                { value: "", label: t("admin.users.roles.select_role") },
                ...roleOptions.map((r) => ({
                  value: r.code,
                  label: `${r.name} (${r.code})`,
                })),
              ]}
              className="mt-1"
            />
          </label>
          <label className="text-xs text-text-muted">
            {t("admin.users.roles.scope")}
            <Select
              value={scopeKind}
              onValueChange={(next) => setScopeKind(next)}
              options={[
                {
                  value: "organization",
                  label: t("admin.users.roles.scope_organization"),
                },
                {
                  value: "org_unit",
                  label: t("admin.users.roles.scope_org_unit"),
                },
                {
                  value: "course",
                  label: t("admin.users.roles.scope_course"),
                },
                {
                  value: "global",
                  label: t("admin.users.roles.scope_global"),
                },
              ]}
              className="mt-1"
            />
          </label>
          {scopeKind === "organization" || scopeKind === "org_unit" ? (
            <label className="text-xs text-text-muted">
              {t("admin.users.roles.organization")}
              <Select
                value={organizationId}
                onValueChange={(next) => setOrganizationId(next)}
                options={[
                  {
                    value: "",
                    label: t("admin.users.roles.select_organization", {
                      defaultValue: "— Select organization —",
                    }),
                  },
                  ...orgOptions.map((o) => ({ value: o.id, label: o.name })),
                ]}
                className="mt-1"
              />
            </label>
          ) : null}
          {scopeKind === "org_unit" ? (
            <label className="text-xs text-text-muted">
              {t("admin.users.roles.org_unit")}
              <Select
                value={orgUnitId}
                onValueChange={(next) => setOrgUnitId(next)}
                disabled={!organizationId}
                options={[
                  {
                    value: "",
                    label: !organizationId
                      ? t("admin.users.roles.select_org_first", {
                          defaultValue: "— Select an organization first —",
                        })
                      : t("admin.users.roles.select_org_unit", {
                          defaultValue: "— Select org unit —",
                        }),
                  },
                  ...orgUnitOptions.map((u) => ({
                    value: u.id,
                    label: u.name,
                  })),
                ]}
                className="mt-1"
              />
            </label>
          ) : null}
          {scopeKind === "course" ? (
            <label className="text-xs text-text-muted">
              {t("admin.users.roles.course_id")}
              <input
                type="text"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-surface-elev px-2 py-1.5 text-sm font-mono"
                required
              />
            </label>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={grant.isPending || !isGrantValid}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white hover:bg-m3-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
          {grant.isPending
            ? t("admin.users.roles.granting")
            : t("admin.users.roles.grant")}
        </button>
      </form>
      {confirmDialog}
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { t, i18n } = useTranslation();
  const params = useParams({ strict: false }) as { userId?: string };
  const userId = params.userId ?? "";
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";

  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");

  const [confirmOpen, setConfirmOpen] = useState(false);

  useRequirePermission(canAdmin, {
    messageKey: "common.no_permission",
  });

  const enabled = !permissions.isLoading && canAdmin && Boolean(userId);
  const detail = useAdminUser(enabled ? userId : "");
  const disable = useDisableUser(userId);
  const enable = useEnableUser(userId);

  if (permissions.isLoading || !canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  const handleDisable = () => {
    setConfirmOpen(false);
    disable.mutate(undefined, {
      onSuccess: (out) =>
        toast.success(
          t("admin.users.roles.success.disabled", {
            count: out.revoked_session_count,
          }),
        ),
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("admin.users.roles.errors.disable_failed"),
        ),
    });
  };

  const handleEnable = () => {
    enable.mutate(undefined, {
      onSuccess: () => toast.success(t("admin.users.roles.success.enabled")),
      onError: (err) =>
        toast.error(
          (err as Error).message || t("admin.users.roles.errors.enable_failed"),
        ),
    });
  };

  const data = detail.data;
  const user = data?.user;
  const displayName =
    user?.profile?.display_name?.trim() || user?.primary_email || "—";
  const isDisabled = user?.status === "disabled" || user?.status === "inactive";

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("sections.admin"), to: "/admin/stats" },
          { label: t("admin.users.title"), to: "/admin/users" },
          { label: displayName },
        ]}
      />
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("admin.users.back_to_list")}
      </Link>

      {detail.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.users.roles.errors.load_failed")}
          </p>
        </div>
      ) : detail.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      ) : user && data ? (
        <>
          <div className="bg-surface-elev border border-border rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
                <UserCircle className="h-7 w-7 text-m3-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-headline font-bold text-text-strong">
                    {displayName}
                  </h1>
                  <StatusBadge status={user.status} />
                </div>
                <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user.primary_email}
                </p>
                <p className="text-xs text-text-subtle mt-2 font-mono break-all">
                  {user.id}
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {isDisabled ? (
                  <button
                    type="button"
                    onClick={handleEnable}
                    disabled={enable.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {enable.isPending
                      ? t("admin.users.actions.disabling")
                      : t("admin.users.actions.enable")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={disable.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <ShieldOff className="h-3.5 w-3.5" />
                    {t("admin.users.actions.disable")}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                {t("admin.users.fields.last_login")}
              </p>
              <p className="text-sm text-text-strong mt-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-text-muted" />
                {formatDate(user.last_login_at, locale)}
              </p>
            </div>
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                {t("admin.users.fields.created_at")}
              </p>
              <p className="text-sm text-text-strong mt-1">
                {formatDate(user.created_at, locale)}
              </p>
            </div>
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                {t("admin.users.fields.updated_at")}
              </p>
              <p className="text-sm text-text-strong mt-1">
                {formatDate(user.updated_at, locale)}
              </p>
            </div>
          </div>

          {user.profile ? (
            <div className="bg-surface-elev border border-border rounded-lg p-5">
              <h2 className="text-sm font-headline font-bold text-text-strong mb-3">
                {t("admin.users.profile_section", { defaultValue: "Profile" })}
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-text-muted">
                    {t("admin.users.fields.display_name")}
                  </dt>
                  <dd className="text-text-strong mt-0.5">
                    {user.profile.display_name || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-text-muted">
                    {t("admin.users.fields.full_name")}
                  </dt>
                  <dd className="text-text-strong mt-0.5">
                    {[user.profile.given_name, user.profile.family_name]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </dd>
                </div>
                {user.profile.bio ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold text-text-muted">
                      {t("admin.users.fields.bio")}
                    </dt>
                    <dd className="text-text-strong mt-0.5 whitespace-pre-wrap">
                      {user.profile.bio}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          <RoleAssignmentsSection
            userId={user.id}
            assignments={data.role_assignments}
          />

          {data.active_sessions.length > 0 ? (
            <div className="bg-surface-elev border border-border rounded-lg p-5">
              <h2 className="text-sm font-headline font-bold text-text-strong mb-3">
                {t("admin.users.roles.active_sessions")} (
                {data.active_sessions.length})
              </h2>
              <ul className="divide-y divide-border">
                {data.active_sessions.map((s) => (
                  <li key={s.id} className="py-2 text-xs text-text-muted">
                    <span className="font-mono">{s.id}</span> —{" "}
                    {t("admin.users.roles.session_ip")} {s.ip_address ?? "—"} ·{" "}
                    {t("admin.users.roles.session_expires")}{" "}
                    {formatDate(s.expires_at, locale)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {confirmOpen ? (
        <ConfirmDisableDialog
          onConfirm={handleDisable}
          onCancel={() => setConfirmOpen(false)}
          isPending={disable.isPending}
        />
      ) : null}
    </div>
  );
}
