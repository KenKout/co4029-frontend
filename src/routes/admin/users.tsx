import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, Mail, Search, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useServerTable } from "@/lib/api/use-server-table";
import { usePermissions } from "@/lib/auth/use-permissions";
import { useListRoles } from "@/lib/api/hooks/admin";
import { useOrganizations } from "@/lib/api/hooks/admin-organizations";
import type { User } from "@/lib/api/types";

// The backend UserRead gained roles[] + organization fields after the
// committed OpenAPI snapshot, so widen the generated type locally rather than
// reading untyped properties. Mirrors the use-server-table.ts note.
type UserWithRoles = User & {
  roles?: string[];
  organization_id?: string | null;
  organization_name?: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const STATUS_COLOR: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    invited: "bg-amber-100 text-amber-700",
    disabled: "bg-red-100 text-red-700",
    inactive: "bg-red-100 text-red-700",
    pending: "bg-slate-100 text-slate-700",
    suspended: "bg-red-100 text-red-700",
  };
  const cls = STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700";
  const label = t(`admin.users.status.${status}`, { defaultValue: status });
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${cls}`}
    >
      {label}
    </span>
  );
}

const ROLE_BADGE_COLOR: Record<string, string> = {
  admin: "bg-rose-50 text-rose-700 border border-rose-200",
  manager: "bg-teal-50 text-teal-700 border border-teal-200",
  hod: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  teacher: "bg-blue-50 text-blue-700 border border-blue-200",
  student: "bg-violet-50 text-violet-700 border border-violet-200",
};

function RoleBadges({
  roles,
  labelFor,
}: {
  roles: string[];
  labelFor: (code: string) => string;
}) {
  const { t } = useTranslation();
  if (roles.length === 0) {
    return (
      <span className="text-xs text-text-muted italic">
        {t("admin.users.roles.none", { defaultValue: "No role" })}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((code) => (
        <span
          key={code}
          className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${
            ROLE_BADGE_COLOR[code] ?? "bg-slate-100 text-slate-700"
          }`}
        >
          {labelFor(code)}
        </span>
      ))}
    </div>
  );
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canAdmin) {
      toast.error(t("admin.users.roles.errors.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canAdmin, navigate, t]);

  // Role list drives both the filter dropdown and the code→name label map for
  // the Role column, so the labels stay in sync with the seeded catalog.
  const roles = useListRoles();
  const roleOptions = useMemo(
    () => (roles.data ?? []).map((r) => r.role),
    [roles.data],
  );
  const labelFor = useMemo(() => {
    const byCode = new Map(roleOptions.map((r) => [r.code, r.name]));
    return (code: string) => byCode.get(code) ?? code;
  }, [roleOptions]);

  // Organization list drives the org filter dropdown (id → name).
  const orgs = useOrganizations({ limit: 200 });
  const orgOptions = orgs.items ?? [];

  // Server-side search + sort + role/org filter + page across the whole set.
  const table = useServerTable<UserWithRoles>({
    queryKey: ["admin", "users", "search"],
    path: "/users/search",
    pageSize: 25,
    enabled: !permissions.isLoading && canAdmin,
  });

  const columns: DataTableColumn<UserWithRoles>[] = useMemo(
    () => [
      {
        // id must match the backend sort whitelist key.
        id: "email",
        header: t("admin.users.cols.user", { defaultValue: "User" }),
        sortable: true,
        cell: (u) => {
          const displayName =
            u.profile?.display_name?.trim() || u.primary_email;
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-m3-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-strong truncate">
                  {displayName}
                </p>
                <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{u.primary_email}</span>
                </p>
              </div>
            </div>
          );
        },
      },
      {
        // Not sortable: roles are a cross-table aggregate, not a User column.
        id: "roles",
        header: t("admin.users.cols.role", { defaultValue: "Role" }),
        cell: (u) => (
          <RoleBadges roles={u.roles ?? []} labelFor={labelFor} />
        ),
      },
      {
        // Not sortable: primary org is a cross-table aggregate (membership).
        id: "organization",
        header: t("admin.users.cols.organization", {
          defaultValue: "Organization",
        }),
        cell: (u) =>
          u.organization_name ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-text-strong">
              <Building2 className="h-3.5 w-3.5 text-text-muted shrink-0" />
              <span className="truncate">{u.organization_name}</span>
            </span>
          ) : (
            <span className="text-xs text-text-muted italic">
              {t("admin.users.no_organization", { defaultValue: "—" })}
            </span>
          ),
      },
      {
        id: "status",
        header: t("admin.users.cols.status", { defaultValue: "Status" }),
        sortable: true,
        cell: (u) => <StatusBadge status={u.status} />,
      },
      {
        id: "created_at",
        header: t("admin.users.cols.joined", { defaultValue: "Joined" }),
        sortable: true,
        align: "right",
        cell: (u) => (
          <span className="text-xs text-text-muted whitespace-nowrap">
            {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
          </span>
        ),
      },
    ],
    [t, labelFor],
  );

  if (permissions.isLoading) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!canAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.users.list_title")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t("admin.users.list_subtitle", {
            defaultValue: "List of users within your permission scope.",
          })}
        </p>
      </div>

      {table.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.users.roles.errors.load_failed")}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={table.rows}
          getRowId={(u) => u.id}
          loading={table.isLoading}
          onRowClick={(u) =>
            void navigate({
              to: "/admin/users/$userId",
              params: { userId: u.id },
            })
          }
          pagination
          manualPagination
          manualSorting
          rowCount={table.total}
          page={table.page}
          pageSize={table.pageSize}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
          pageSizeOptions={[25, 50, 100]}
          sort={table.sort}
          onSortChange={table.setSort}
          emptyState={
            table.search || table.roleFilter || table.orgFilter
              ? t("admin.users.empty_search", {
                  defaultValue: "No matching users",
                })
              : t("admin.users.empty_title", { defaultValue: "No users yet" })
          }
          toolbar={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-md flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                <Input
                  type="text"
                  value={table.search}
                  onChange={(e) => table.setSearch(e.target.value)}
                  placeholder={t("admin.users.search_placeholder", {
                    defaultValue: "Search by name or email…",
                  })}
                  className="pl-10"
                />
              </div>
              <select
                value={table.roleFilter ?? ""}
                onChange={(e) => table.setRoleFilter(e.target.value || undefined)}
                className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-strong outline-none focus:border-primary cursor-pointer"
                aria-label={t("admin.users.filter_role", {
                  defaultValue: "Filter by role",
                })}
              >
                <option value="">
                  {t("admin.users.all_roles", { defaultValue: "All roles" })}
                </option>
                {roleOptions.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
              <select
                value={table.orgFilter ?? ""}
                onChange={(e) => table.setOrgFilter(e.target.value || undefined)}
                className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-strong outline-none focus:border-primary cursor-pointer max-w-[220px]"
                aria-label={t("admin.users.filter_organization", {
                  defaultValue: "Filter by organization",
                })}
              >
                <option value="">
                  {t("admin.users.all_organizations", {
                    defaultValue: "All organizations",
                  })}
                </option>
                {orgOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      )}
    </div>
  );
}
