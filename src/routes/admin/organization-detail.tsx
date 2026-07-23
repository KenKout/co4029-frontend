import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Globe,
  Layers,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminUsersSearch,
  type AdminUserSearchRow,
  useCreateDomain,
  useCreateMembership,
  useCreateOrgUnit,
  useDeleteDomain,
  useDeleteMembership,
  useDeleteOrgUnit,
  useOrganization,
  useOrganizationDomains,
  useOrganizationMemberships,
  useOrgUnits,
  usePatchMembership,
  usePatchOrganization,
} from "@/lib/api/hooks/admin-organizations";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import type {
  MembershipRead,
  MembershipStatus,
  OrganizationStatus,
  UnitType,
} from "@/lib/api/types/admin-organizations";

type TabKey = "info" | "domains" | "units" | "memberships";

const TAB_KEYS: TabKey[] = ["info", "domains", "units", "memberships"];

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-amber-100 text-amber-700",
  archived: "bg-slate-100 text-slate-700",
  invited: "bg-sky-100 text-sky-700",
  suspended: "bg-red-100 text-red-700",
  left: "bg-slate-100 text-slate-600",
};

function StatusBadge({
  status,
  type = "org",
}: {
  status: string;
  type?: "org" | "membership";
}) {
  const { t } = useTranslation();
  const cls = STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700";
  const ns =
    type === "org"
      ? "admin.organizations.status_label"
      : "admin.organizations.membership_status_label";
  const label = t(`${ns}.${status}`, { defaultValue: status });
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${cls}`}
    >
      {label}
    </span>
  );
}

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function InfoTab({ orgId }: { orgId: string }) {
  const { t, i18n } = useTranslation();
  const { data: org } = useOrganization(orgId);
  const patch = usePatchOrganization(orgId);
  const [draftName, setDraftName] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<OrganizationStatus | null>(
    null,
  );

  if (!org) {
    return <Skeleton className="h-72 rounded-xl" />;
  }

  const name = draftName ?? org.name;
  const orgStatus = draftStatus ?? (org.status as OrganizationStatus);
  const dirty = name !== org.name || orgStatus !== org.status;

  async function handleSave() {
    try {
      await patch.mutateAsync({
        name: name !== org!.name ? name : undefined,
        status: orgStatus !== org!.status ? orgStatus : undefined,
      });
      setDraftName(null);
      setDraftStatus(null);
      toast.success(t("admin.organizations.toasts.update_success"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.organizations.toasts.update_failed"),
      );
    }
  }

  return (
    <div className="rounded-xl bg-white border border-m3-outline-variant/40 p-6 space-y-6">
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-text-muted">
            {t("admin.organizations.fields.slug")}
          </dt>
          <dd className="font-mono text-sm mt-0.5">{org.slug}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">
            {t("admin.organizations.fields.id")}
          </dt>
          <dd className="font-mono text-xs mt-0.5 break-all">{org.id}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">
            {t("admin.organizations.fields.created_at")}
          </dt>
          <dd className="text-sm mt-0.5">
            {formatDate(org.created_at, i18n.language)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">
            {t("admin.organizations.fields.updated_at")}
          </dt>
          <dd className="text-sm mt-0.5">
            {formatDate(org.updated_at, i18n.language)}
          </dd>
        </div>
      </dl>

      <div className="border-t border-m3-outline-variant/40 pt-5 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-text-strong">
            {t("admin.organizations.fields.name")}
          </span>
          <Input
            type="text"
            value={name}
            onChange={(e) => setDraftName(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-text-strong">
            {t("admin.organizations.fields.status")}
          </span>
          <select
            value={orgStatus}
            onChange={(e) =>
              setDraftStatus(e.target.value as OrganizationStatus)
            }
            className="mt-1 w-full h-10 rounded-md border border-m3-outline-variant px-3 text-sm bg-white"
          >
            {(["active", "inactive", "archived"] as const).map((k) => (
              <option key={k} value={k}>
                {t(`admin.organizations.status_label.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!dirty || patch.isPending}
          >
            {patch.isPending
              ? t("admin.organizations.actions.saving")
              : t("admin.organizations.actions.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DomainsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const { data: domains, isLoading } = useOrganizationDomains(orgId);
  const create = useCreateDomain(orgId);
  const remove = useDeleteDomain(orgId);
  const [domain, setDomain] = useState("");
  const [autoProvision, setAutoProvision] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ domain, auto_provision: autoProvision });
      setDomain("");
      setAutoProvision(false);
      toast.success(t("admin.organizations.toasts.domain_added"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.organizations.toasts.create_failed"),
      );
    }
  }

  async function handleRemove(id: string) {
    if (!confirm(t("admin.organizations.confirm.delete_domain"))) return;
    try {
      await remove.mutateAsync(id);
      toast.success(t("admin.organizations.toasts.delete_success"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.organizations.toasts.delete_failed"),
      );
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="rounded-xl bg-white border border-m3-outline-variant/40 p-4 flex flex-wrap items-end gap-3"
      >
        <label className="flex-1 min-w-[220px]">
          <span className="text-sm font-semibold text-text-strong">
            {t("admin.organizations.fields.domain")}
          </span>
          <Input
            type="text"
            required
            value={domain}
            onChange={(e) => setDomain(e.target.value.toLowerCase())}
            placeholder="example.edu.vn"
            className="mt-1"
          />
        </label>
        <label className="flex items-center gap-2 text-sm py-2">
          <input
            type="checkbox"
            checked={autoProvision}
            onChange={(e) => setAutoProvision(e.target.checked)}
            className="rounded"
          />
          {t("admin.organizations.fields.auto_provision")}
        </label>
        <Button type="submit" disabled={create.isPending} className="gap-1">
          <Plus className="h-4 w-4" />
          {create.isPending
            ? t("admin.organizations.actions.adding")
            : t("admin.organizations.actions.add")}
        </Button>
      </form>

      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (domains ?? []).length === 0 ? (
        <div className="rounded-xl border border-m3-outline-variant/40 bg-white p-10 text-center">
          <Globe className="h-10 w-10 mx-auto mb-3 text-text-muted" />
          <p className="text-sm text-text-muted">
            {t("admin.organizations.empty.domains")}
          </p>
        </div>
      ) : (
        <ul className="rounded-xl bg-white border border-m3-outline-variant/40 divide-y divide-m3-outline-variant/40">
          {(domains ?? []).map((d) => (
            <li
              key={d.id}
              className="px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm text-text-strong">{d.domain}</p>
                {d.auto_provision && (
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {t("admin.organizations.fields.auto_provision")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(d.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md shrink-0"
                aria-label={t("admin.organizations.actions.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UnitsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const { data: units, isLoading } = useOrgUnits(orgId);
  const create = useCreateOrgUnit(orgId);
  const remove = useDeleteOrgUnit(orgId);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [unitType, setUnitType] = useState<UnitType>("department");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({
        unit_type: unitType,
        name,
        code: code || null,
        parent_unit_id: null,
      });
      setName("");
      setCode("");
      toast.success(t("admin.organizations.toasts.unit_added"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.organizations.toasts.create_failed"),
      );
    }
  }

  async function handleRemove(id: string) {
    if (!confirm(t("admin.organizations.confirm.delete_unit"))) return;
    try {
      await remove.mutateAsync(id);
      toast.success(t("admin.organizations.toasts.delete_success"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.organizations.toasts.delete_failed"),
      );
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="rounded-xl bg-white border border-m3-outline-variant/40 p-4 grid grid-cols-1 md:grid-cols-12 gap-3"
      >
        <label className="md:col-span-3">
          <span className="text-sm font-semibold text-text-strong">
            {t("admin.organizations.fields.unit_type")}
          </span>
          <select
            value={unitType}
            onChange={(e) => setUnitType(e.target.value as UnitType)}
            className="mt-1 w-full h-10 rounded-md border border-m3-outline-variant px-3 text-sm bg-white"
          >
            {(
              [
                "faculty",
                "department",
                "office",
                "program",
                "campus",
                "other",
              ] as UnitType[]
            ).map((k) => (
              <option key={k} value={k}>
                {t(`admin.organizations.unit_type_label.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="md:col-span-5">
          <span className="text-sm font-semibold text-text-strong">
            {t("admin.organizations.fields.name")}{" "}
            <span className="text-red-500">*</span>
          </span>
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="md:col-span-2">
          <span className="text-sm font-semibold text-text-strong">
            {t("admin.organizations.fields.code")}
          </span>
          <Input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="CNTT"
            className="mt-1 font-mono"
          />
        </label>
        <div className="md:col-span-2 flex items-end">
          <Button
            type="submit"
            disabled={create.isPending}
            className="w-full gap-1"
          >
            <Plus className="h-4 w-4" />
            {create.isPending
              ? t("admin.organizations.actions.adding")
              : t("admin.organizations.actions.add")}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (units ?? []).length === 0 ? (
        <div className="rounded-xl border border-m3-outline-variant/40 bg-white p-10 text-center">
          <Layers className="h-10 w-10 mx-auto mb-3 text-text-muted" />
          <p className="text-sm text-text-muted">
            {t("admin.organizations.empty.units")}
          </p>
        </div>
      ) : (
        <ul className="rounded-xl bg-white border border-m3-outline-variant/40 divide-y divide-m3-outline-variant/40">
          {(units ?? []).map((u) => (
            <li
              key={u.id}
              className="px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-strong">
                  {u.name}
                  {u.code && (
                    <span className="ml-2 text-xs text-text-muted font-mono font-normal">
                      [{u.code}]
                    </span>
                  )}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {t(`admin.organizations.unit_type_label.${u.unit_type}`, {
                    defaultValue: u.unit_type,
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(u.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md shrink-0"
                aria-label={t("admin.organizations.actions.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Membership row with inline status edit
function MembershipRow({ m, orgId }: { m: MembershipRead; orgId: string }) {
  const { t, i18n } = useTranslation();
  const patch = usePatchMembership(orgId);
  const remove = useDeleteMembership(orgId);
  const [editing, setEditing] = useState(false);
  const [draftStatus, setDraftStatus] = useState<MembershipStatus>(
    m.status as MembershipStatus,
  );

  async function handleSave() {
    try {
      await patch.mutateAsync({
        membershipId: m.id,
        body: { status: draftStatus },
      });
      setEditing(false);
      toast.success(t("admin.organizations.toasts.member_updated"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.organizations.toasts.update_failed"),
      );
    }
  }

  async function handleRemove() {
    if (!confirm(t("admin.organizations.confirm.delete_membership"))) return;
    try {
      await remove.mutateAsync(m.id);
      toast.success(t("admin.organizations.toasts.delete_success"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.organizations.toasts.delete_failed"),
      );
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-text-strong break-all">
            {m.user_id}
          </p>
          <div className="text-xs text-text-muted mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {m.student_code && (
              <span>
                {t("admin.organizations.fields.student_code")}:{" "}
                <span className="font-mono">{m.student_code}</span>
              </span>
            )}
            {m.employee_code && (
              <span>
                {t("admin.organizations.fields.employee_code")}:{" "}
                <span className="font-mono">{m.employee_code}</span>
              </span>
            )}
            <span>
              {t("admin.organizations.fields.joined_at")}:{" "}
              {formatDate(m.joined_at, i18n.language)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              <select
                value={draftStatus}
                onChange={(e) =>
                  setDraftStatus(e.target.value as MembershipStatus)
                }
                className="h-8 rounded-md border border-m3-outline-variant px-2 text-xs bg-white"
              >
                {(
                  [
                    "active",
                    "invited",
                    "inactive",
                    "suspended",
                    "left",
                  ] as MembershipStatus[]
                ).map((k) => (
                  <option key={k} value={k}>
                    {t(`admin.organizations.membership_status_label.${k}`)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={patch.isPending}
              >
                {t("admin.organizations.actions.save")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setDraftStatus(m.status as MembershipStatus);
                }}
              >
                {t("admin.organizations.actions.cancel")}
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="cursor-pointer"
                aria-label={t("admin.organizations.actions.edit")}
              >
                <StatusBadge status={m.status} type="membership" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                aria-label={t("admin.organizations.actions.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

// Combobox typeahead — server-side search via /admin/users?q=. Fires
// the request 200ms after the user stops typing. The membership-add
// button enables the query so we don't pay the round-trip until the
// form opens.
function UserSearchCombobox({
  value,
  onSelect,
  enabled,
}: {
  value: AdminUserSearchRow | null;
  onSelect: (user: AdminUserSearchRow | null) => void;
  enabled: boolean;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: matches, isLoading } = useAdminUsersSearch(
    debouncedQuery,
    enabled,
  );

  if (value) {
    return (
      <div className="rounded-md border border-m3-outline-variant bg-white px-3 py-2 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-strong truncate">
            {value.display_name?.trim() || value.primary_email}
          </p>
          <p className="text-xs text-text-muted truncate">
            {value.primary_email}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-text-muted hover:text-text-strong shrink-0"
          aria-label={t("admin.organizations.actions.cancel")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t(
            "admin.organizations.memberships.user_search_placeholder",
          )}
          className="pl-10"
        />
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-m3-outline-variant bg-white shadow-lg max-h-64 overflow-auto">
          {isLoading ? (
            <p className="p-3 text-sm text-text-muted">
              {t("admin.organizations.memberships.user_search_loading")}
            </p>
          ) : !matches || matches.length === 0 ? (
            <p className="p-3 text-sm text-text-muted">
              {t("admin.organizations.memberships.user_search_empty")}
            </p>
          ) : (
            <ul className="py-1">
              {matches.map((u) => (
                <li key={u.user_id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(u);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-m3-primary-fixed/40 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-m3-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-strong truncate">
                        {u.display_name?.trim() || u.primary_email}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {u.primary_email}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function MembershipsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const { data: members, isLoading } = useOrganizationMemberships(orgId);
  const create = useCreateMembership(orgId);
  const [mode, setMode] = useState<"list" | "add" | "bulk">("list");
  const [selectedUser, setSelectedUser] = useState<AdminUserSearchRow | null>(
    null,
  );
  const [studentCode, setStudentCode] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [memStatus, setMemStatus] = useState<MembershipStatus>("active");

  // Bulk add state
  const [bulkText, setBulkText] = useState("");
  const [bulkResults, setBulkResults] = useState<{
    ok: string[];
    failed: string[];
  } | null>(null);
  const [bulkPending, setBulkPending] = useState(false);

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const parsedBulk = useMemo(() => {
    const userIds: string[] = [];
    const invalid: string[] = [];
    for (const raw of bulkText.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (UUID_RE.test(line)) userIds.push(line);
      else invalid.push(line);
    }
    return { userIds, invalid };
  }, [bulkText]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await create.mutateAsync({
        user_id: selectedUser.user_id,
        org_unit_id: null,
        status: memStatus,
        student_code: studentCode || null,
        employee_code: employeeCode || null,
      });
      setSelectedUser(null);
      setStudentCode("");
      setEmployeeCode("");
      setMemStatus("active");
      setMode("list");
      toast.success(t("admin.organizations.toasts.member_added"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.organizations.toasts.create_failed"),
      );
    }
  }

  async function handleBulkAdd(e: React.FormEvent) {
    e.preventDefault();
    const lines = parsedBulk.userIds;
    if (lines.length === 0) return;
    setBulkPending(true);
    const ok: string[] = [];
    const failed: string[] = [];
    for (const userId of lines) {
      try {
        await create.mutateAsync({
          user_id: userId,
          org_unit_id: null,
          status: "active",
          student_code: null,
          employee_code: null,
        });
        ok.push(userId);
      } catch {
        failed.push(userId);
      }
    }
    setBulkPending(false);
    setBulkResults({ ok, failed });
    setBulkText("");
    if (ok.length > 0) {
      toast.success(
        t("admin.organizations.toasts.bulk_added", {
          count: ok.length,
          defaultValue: `Added ${ok.length} member(s)`,
        }),
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "add" ? "default" : "outline"}
            onClick={() => setMode(mode === "add" ? "list" : "add")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("admin.organizations.memberships.add_title")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "bulk" ? "default" : "outline"}
            onClick={() => setMode(mode === "bulk" ? "list" : "bulk")}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            {t("admin.organizations.memberships.bulk_add_title", {
              defaultValue: "Bulk Add",
            })}
          </Button>
        </div>
        {mode !== "list" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setMode("list");
              setBulkResults(null);
            }}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            {t("admin.organizations.actions.cancel")}
          </Button>
        )}
      </div>

      {mode === "add" && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl bg-white border border-m3-outline-variant/40 p-4 space-y-3"
        >
          <p className="text-sm text-text-muted">
            {t("admin.organizations.memberships.add_intro")}
          </p>
          <label className="block">
            <span className="text-sm font-semibold text-text-strong">
              {t("admin.organizations.memberships.user_label")}{" "}
              <span className="text-red-500">*</span>
            </span>
            <div className="mt-1">
              <UserSearchCombobox
                value={selectedUser}
                onSelect={setSelectedUser}
                enabled={mode === "add"}
              />
            </div>
            <span className="text-xs text-text-muted mt-1 block">
              {t("admin.organizations.memberships.user_search_hint")}
            </span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label>
              <span className="text-sm font-semibold text-text-strong">
                {t("admin.organizations.fields.status")}
              </span>
              <select
                value={memStatus}
                onChange={(e) =>
                  setMemStatus(e.target.value as MembershipStatus)
                }
                className="mt-1 w-full h-10 rounded-md border border-m3-outline-variant px-3 text-sm bg-white"
              >
                {(
                  [
                    "active",
                    "invited",
                    "inactive",
                    "suspended",
                    "left",
                  ] as MembershipStatus[]
                ).map((k) => (
                  <option key={k} value={k}>
                    {t(`admin.organizations.membership_status_label.${k}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-semibold text-text-strong">
                {t("admin.organizations.fields.student_code")}
              </span>
              <Input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                className="mt-1 font-mono"
              />
            </label>
            <label>
              <span className="text-sm font-semibold text-text-strong">
                {t("admin.organizations.fields.employee_code")}
              </span>
              <Input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="mt-1 font-mono"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={create.isPending || !selectedUser}>
              {create.isPending
                ? t("admin.organizations.actions.adding")
                : t("admin.organizations.actions.add")}
            </Button>
          </div>
        </form>
      )}

      {mode === "bulk" && (
        <form
          onSubmit={handleBulkAdd}
          className="rounded-xl bg-white border border-m3-outline-variant/40 p-4 space-y-3"
        >
          <div>
            <p className="text-sm font-semibold text-text-strong">
              {t("admin.organizations.memberships.bulk_add_title", {
                defaultValue: "Bulk Add Members",
              })}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {t("admin.organizations.memberships.bulk_add_hint", {
                defaultValue:
                  "Paste one user UUID per line. All will be added as active members. Find user UUIDs on the Users page.",
              })}
            </p>
          </div>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            placeholder={
              "550e8400-e29b-41d4-a716-446655440000\na1b2c3d4-e5f6-7890-abcd-ef1234567890"
            }
            className="w-full px-4 py-3 text-sm font-mono bg-white border border-m3-outline-variant/40 rounded-xl text-text-strong focus:outline-none focus:ring-2 focus:ring-m3-primary/30 placeholder:text-text-muted/40"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
            <div className="flex gap-3">
              <span>
                UUID: <strong>{parsedBulk.userIds.length}</strong>
              </span>
              {parsedBulk.invalid.length > 0 && (
                <span className="text-amber-700">
                  {parsedBulk.invalid.length} invalid line(s) will be skipped
                </span>
              )}
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={bulkPending || parsedBulk.userIds.length === 0}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {bulkPending
                ? t("admin.organizations.actions.adding")
                : t("admin.organizations.memberships.bulk_add_title", {
                    defaultValue: "Add All",
                  })}
            </Button>
          </div>

          {bulkResults && (
            <div className="rounded-lg border border-m3-outline-variant/40 p-3 space-y-2 text-sm">
              {bulkResults.ok.length > 0 && (
                <p className="text-emerald-700 font-semibold">
                  ✓ Added {bulkResults.ok.length} member(s)
                </p>
              )}
              {bulkResults.failed.length > 0 && (
                <div>
                  <p className="text-red-600 font-semibold">
                    ✗ Failed {bulkResults.failed.length}:
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs font-mono text-text-muted">
                    {bulkResults.failed.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </form>
      )}

      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (members ?? []).length === 0 ? (
        <div className="rounded-xl border border-m3-outline-variant/40 bg-white p-10 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-text-muted" />
          <p className="text-sm text-text-muted">
            {t("admin.organizations.empty.memberships")}
          </p>
        </div>
      ) : (
        <ul className="rounded-xl bg-white border border-m3-outline-variant/40 divide-y divide-m3-outline-variant/40">
          {(members ?? []).map((m) => (
            <MembershipRow key={m.id} m={m} orgId={orgId} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminOrganizationDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orgId } = useParams({ strict: false });
  const [tab, setTab] = useState<TabKey>("info");
  const permissions = useMyPermissions();
  const { data: org, isLoading } = useOrganization(orgId);

  const canManage = useMemo(() => {
    const perms = permissions.data?.permissions ?? [];
    return (
      perms.includes("system.administer") ||
      perms.includes("org_unit.manage") ||
      perms.includes("user.bulk_import")
    );
  }, [permissions.data]);

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canManage) {
      toast.error(t("admin.users.roles.errors.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canManage, navigate, t]);

  if (!orgId) return null;
  if (permissions.isLoading || isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-6 w-40 rounded-md" />
        <Skeleton className="h-12 w-72 rounded-md" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (!canManage) return null;

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("nav.admin"), to: "/admin/stats" },
          {
            label: t("admin.organizations.title"),
            to: "/admin/organizations",
          },
          { label: org?.name ?? "..." },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-m3-primary-fixed flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6 text-m3-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-headline font-bold text-text-strong truncate">
              {org?.name ?? "..."}
            </h1>
            {org && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm font-mono text-text-muted">
                  {org.slug}
                </span>
                <StatusBadge status={org.status} />
              </div>
            )}
          </div>
        </div>
        <Link
          to="/admin/organizations"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-strong"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("admin.organizations.back_to_list")}
        </Link>
      </div>

      <div className="border-b border-m3-outline-variant/40 flex gap-1 overflow-x-auto">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab === key
                ? "border-m3-primary text-m3-primary"
                : "border-transparent text-text-muted hover:text-text-strong"
            }`}
          >
            {t(`admin.organizations.tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === "info" && <InfoTab orgId={orgId} />}
      {tab === "domains" && <DomainsTab orgId={orgId} />}
      {tab === "units" && <UnitsTab orgId={orgId} />}
      {tab === "memberships" && <MembershipsTab orgId={orgId} />}
    </div>
  );
}
