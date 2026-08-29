import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Building2, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { OrgStatusBadge as StatusBadge } from "@/components/ui/status-badges";
import { useServerTable } from "@/lib/api/use-server-table";
import { useCreateOrganization } from "@/lib/api/hooks/admin-organizations";
import { usePermissions } from "@/lib/auth/use-permissions";
import { PermissionDenied } from "@/components/ui/permission-denied";
import type {
  OrganizationRead,
  OrganizationStatus,
} from "@/lib/api/types/admin-organizations";

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
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-strong"
            aria-label={t("admin.organizations.actions.cancel")}
          >
            <X className="h-5 w-5" />
          </Button>
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
            <Select<OrganizationStatus>
              value={orgStatus}
              onValueChange={(next) => setOrgStatus(next)}
              options={(["active", "inactive", "archived"] as const).map(
                (k) => ({
                  value: k,
                  label: t(`admin.organizations.status_label.${k}`),
                }),
              )}
              className="mt-1"
            />
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
  const permissions = usePermissions();
  const canManage = permissions.hasAny(
    "system.administer",
    "org_unit.manage",
    "user.bulk_import",
  );

  const [showCreate, setShowCreate] = useState(false);

  // Arriving from the dashboard's inactive-tenant tile: filter to exactly the
  // rows that produced the count. The server applies the same definition it
  // counted with, so the number on the tile and the row count here agree.
  const search = useSearch({ strict: false }) as { inactive_days?: number };
  const inactiveDays = search.inactive_days;

  // Server-side search + sort + page (whole dataset, not just loaded rows).
  const table = useServerTable<OrganizationRead>({
    queryKey: ["admin", "organizations", "search", inactiveDays ?? "all"],
    path: "/admin/organizations/search",
    pageSize: 25,
    filters: inactiveDays ? { inactive_days: String(inactiveDays) } : undefined,
  });

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

  if (!canManage) return <PermissionDenied />;

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
            <SearchInput
              wrapperClassName="max-w-md"
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
              placeholder={t("admin.organizations.search_placeholder")}
              className="pl-10"
            />
          }
        />
      )}

      {showCreate && <CreateOrgDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
