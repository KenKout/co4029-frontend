import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail, Search, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useServerTable } from "@/lib/api/use-server-table";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import type { User } from "@/lib/api/types";

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

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const permissions = useMyPermissions();
  const canAdmin =
    permissions.data?.permissions.includes("system.administer") ?? false;

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canAdmin) {
      toast.error(t("admin.users.roles.errors.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canAdmin, navigate, t]);

  // Server-side search + sort + page across the whole user set (the old
  // InfiniteList had no search — an admin could not find a user by email).
  const table = useServerTable<User>({
    queryKey: ["admin", "users", "search"],
    path: "/users/search",
    pageSize: 25,
    enabled: !permissions.isLoading && canAdmin,
  });

  const columns: DataTableColumn<User>[] = useMemo(
    () => [
      {
        // id must match the backend sort whitelist key.
        id: "email",
        header: t("admin.users.cols.user", { defaultValue: "User" }),
        sortable: true,
        cell: (u) => {
          const displayName = u.profile?.display_name?.trim() || u.primary_email;
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
    [t],
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
            void navigate({ to: "/admin/users/$userId", params: { userId: u.id } })
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
            table.search
              ? t("admin.users.empty_search", { defaultValue: "No matching users" })
              : t("admin.users.empty_title", { defaultValue: "No users yet" })
          }
          toolbar={
            <div className="relative max-w-md">
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
          }
        />
      )}
    </div>
  );
}
