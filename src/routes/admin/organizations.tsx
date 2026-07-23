import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Plus, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useServerTable } from "@/lib/api/use-server-table";
import { useCreateOrganization } from "@/lib/api/hooks/admin-organizations";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import type {
  OrganizationRead,
  OrganizationStatus,
} from "@/lib/api/types/admin-organizations";

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-amber-100 text-amber-700",
  archived: "bg-slate-100 text-slate-700",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls = STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700";
  const label = t(`admin.organizations.status_label.${status}`, {
    defaultValue: status,
  });
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${cls}`}
    >
      {label}
    </span>
  );
}

function CreateOrgDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [orgStatus, setOrgStatus] = useState<OrganizationStatus>("active");
  const create = useCreateOrganization();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ slug, name, status: orgStatus });
      toast.success(t("admin.organizations.toasts.create_success"));
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.organizations.toasts.create_failed"),
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
      >
        <div className="flex items-start justify-between mb-5">
          <h2 className="font-headline text-xl font-bold text-text-strong">
            {t("admin.organizations.create_dialog_title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-strong"
            aria-label={t("admin.organizations.actions.cancel")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-text-strong">
              {t("admin.organizations.fields.slug")}{" "}
              <span className="text-red-500">*</span>
            </span>
            <Input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              pattern="^[a-z0-9][a-z0-9-]*$"
              placeholder="hutech, hcmut..."
              className="mt-1 font-mono"
            />
            <span className="text-xs text-text-muted mt-1 block">
              {t("admin.organizations.fields.slug_hint")}
            </span>
          </label>
          <label className="block">
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
          <label className="block">
            <span className="text-sm font-semibold text-text-strong">
              {t("admin.organizations.fields.status")}
            </span>
            <select
              value={orgStatus}
              onChange={(e) =>
                setOrgStatus(e.target.value as OrganizationStatus)
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
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={create.isPending}
          >
            {t("admin.organizations.actions.cancel")}
          </Button>
          <Button type="submit" disabled={create.isPending} className="gap-2">
            {create.isPending
              ? t("admin.organizations.actions.creating")
              : t("admin.organizations.actions.create")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AdminOrganizationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = useMyPermissions();
  const canManage = useMemo(() => {
    const perms = permissions.data?.permissions ?? [];
    return (
      perms.includes("system.administer") ||
      perms.includes("org_unit.manage") ||
      perms.includes("user.bulk_import")
    );
  }, [permissions.data]);

  const [showCreate, setShowCreate] = useState(false);

  // Server-side search + sort + page (whole dataset, not just loaded rows).
  const table = useServerTable<OrganizationRead>({
    queryKey: ["admin", "organizations", "search"],
    path: "/admin/organizations/search",
    pageSize: 25,
  });

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canManage) {
      toast.error(t("admin.users.roles.errors.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canManage, navigate, t]);

  const columns: DataTableColumn<OrganizationRead>[] = [
    {
      id: "name",
      header: t("admin.organizations.fields.name"),
      sortable: true,
      cell: (o) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-m3-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-strong truncate">
              {o.name}
            </p>
            <p className="text-xs text-text-muted font-mono truncate">
              {o.slug}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "status",
      header: t("admin.organizations.fields.status"),
      sortable: true,
      cell: (o) => <StatusBadge status={o.status} />,
    },
    {
      id: "created_at",
      header: t("admin.organizations.cols.created", {
        defaultValue: "Created",
      }),
      sortable: true,
      align: "right",
      cell: (o) => (
        <span className="text-xs text-text-muted whitespace-nowrap">
          {new Date(o.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  if (permissions.isLoading) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!canManage) return null;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-headline font-bold text-text-strong">
            {t("admin.organizations.list_title")}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t("admin.organizations.list_subtitle")}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowCreate(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("admin.organizations.create_button")}
        </Button>
      </div>

      {table.isError ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {t("admin.organizations.load_failed", {
            defaultValue: "Failed to load organizations",
          })}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={table.rows}
          getRowId={(o) => o.id}
          loading={table.isLoading}
          onRowClick={(o) =>
            void navigate({
              to: "/admin/organizations/$orgId",
              params: { orgId: o.id },
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
            table.search
              ? t("admin.organizations.empty_search")
              : t("admin.organizations.empty_title")
          }
          toolbar={
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <Input
                type="text"
                value={table.search}
                onChange={(e) => table.setSearch(e.target.value)}
                placeholder={t("admin.organizations.search_placeholder")}
                className="pl-10"
              />
            </div>
          }
        />
      )}

      {showCreate && <CreateOrgDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
