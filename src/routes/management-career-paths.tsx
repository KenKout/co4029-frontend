import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { GraduationCap, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { CareerPathStatusBadge } from "@/components/ui/status-badges";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import {
  DataTableToolbar,
  type FilterDef,
} from "@/components/ui/data-table-toolbar";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissions } from "@/lib/auth/use-permissions";
import { useFormatDate } from "@/lib/format/date";
import {
  useCreateCareerPath,
  useListManagedCareerPaths,
} from "@/lib/api/hooks/career-paths";
import type { CareerPathAuthoring } from "@/lib/api/types";

const STATUS_FILTER_ID = "status";

/** Table columns for the management career-path list. */
function buildPathColumns(
  t: TFunction,
  formatDate: (iso: string | null | undefined) => string,
): DataTableColumn<CareerPathAuthoring>[] {
  return [
    {
      id: "name",
      header: t("management_career_paths.col_name"),
      sortable: true,
      sortValue: (p) => p.name,
      cell: (p) => (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-m3-on-surface truncate">
            {p.name}
          </p>
          <p className="text-[11px] font-mono text-m3-on-surface-variant truncate mt-0.5">
            {p.slug}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: t("management_career_paths.col_status"),
      cell: (p) => <CareerPathStatusBadge status={p.status} />,
    },
    {
      id: "stage_count",
      header: t("management_career_paths.col_stages"),
      align: "right",
      sortable: true,
      sortValue: (p) => p.stage_count ?? 0,
      cell: (p) => (
        <span className="text-sm tabular-nums text-m3-on-surface">
          {p.stage_count ?? 0}
        </span>
      ),
    },
    {
      id: "course_count",
      header: t("management_career_paths.col_courses"),
      align: "right",
      sortable: true,
      sortValue: (p) => p.course_count ?? 0,
      cell: (p) => (
        <span className="text-sm tabular-nums text-m3-on-surface">
          {p.course_count ?? 0}
        </span>
      ),
    },
    {
      id: "updated_at",
      header: t("management_career_paths.col_updated"),
      sortable: true,
      sortValue: (p) => p.updated_at,
      cell: (p) => (
        <span className="text-sm text-m3-on-surface-variant whitespace-nowrap">
          {formatDate(p.updated_at)}
        </span>
      ),
    },
  ];
}

/** DataTable + toolbar for the management career-path list. */
function CareerPathsTable({
  paths,
  isLoading,
  hasFilter,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  canManage,
  onOpen,
  onCreate,
}: {
  paths: CareerPathAuthoring[];
  isLoading: boolean;
  hasFilter: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string | undefined;
  onStatusFilterChange: (value: string | undefined) => void;
  canManage: boolean;
  onOpen: (path: CareerPathAuthoring) => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const columns = useMemo(
    () => buildPathColumns(t, formatDate),
    [t, formatDate],
  );

  const filterDefs: FilterDef[] = [
    {
      id: STATUS_FILTER_ID,
      label: t("management_career_paths.filter_status"),
      allLabel: t("management_career_paths.filter_status_all"),
      options: (["draft", "published", "archived"] as const).map((s) => ({
        value: s,
        label: t(`management_career_paths.status.${s}`),
      })),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={paths}
      getRowId={(p) => p.id}
      loading={isLoading}
      onRowClick={onOpen}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 25, 50]}
      emptyState={
        hasFilter ? (
          t("management_career_paths.empty_search")
        ) : (
          <div className="py-10 text-center">
            <GraduationCap className="h-8 w-8 mx-auto mb-3 text-m3-outline" />
            <p className="text-sm font-medium text-m3-on-surface">
              {t("management_career_paths.empty_title")}
            </p>
            <p className="text-xs text-m3-on-surface-variant mt-1">
              <Trans
                i18nKey="management_career_paths.empty_body"
                t={t}
                components={{ strong: <strong /> }}
              />
            </p>
          </div>
        )
      }
      toolbar={
        <DataTableToolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder={t("management_career_paths.search_placeholder")}
          filters={filterDefs}
          filterValues={{ [STATUS_FILTER_ID]: statusFilter }}
          onFilterChange={(filterId, value) => {
            if (filterId === STATUS_FILTER_ID) onStatusFilterChange(value);
          }}
          onResetAllFilters={() => onStatusFilterChange(undefined)}
          clearLabel={t("management_career_paths.clear_filters")}
          trailing={
            canManage ? (
              <Button
                size="sm"
                onClick={onCreate}
                className="gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                {t("management_career_paths.create_button")}
              </Button>
            ) : undefined
          }
        />
      }
    />
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateCareerPath();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  function slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error(
        t("management_career_paths.create_dialog.errors.need_name_slug"),
      );
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: (path) => {
          toast.success(
            t("management_career_paths.create_dialog.success.created"),
          );
          void navigate({
            to: "/management/career-paths/$id",
            params: { id: path.id },
          });
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_career_paths.create_dialog.errors.create_failed"),
          ),
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-popover rounded-xl shadow-lg p-6 space-y-5"
      >
        <div>
          <h2 className="text-lg font-headline font-bold text-m3-on-surface">
            {t("management_career_paths.create_dialog.title")}
          </h2>
          <p className="text-xs text-m3-on-surface-variant mt-1">
            <Trans
              i18nKey="management_career_paths.create_dialog.intro_pre"
              t={t}
            />{" "}
            <strong>
              {t("management_career_paths.create_dialog.intro_status")}
            </strong>
            {t("management_career_paths.create_dialog.intro_post")}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_career_paths.create_dialog.name")}{" "}
            <span className="text-red-600">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t(
              "management_career_paths.create_dialog.name_placeholder",
            )}
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_career_paths.create_dialog.slug")}{" "}
            <span className="text-red-600">*</span>
          </label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={t(
              "management_career_paths.create_dialog.slug_placeholder",
            )}
            className="font-mono"
            required
          />
          <p className="text-[11px] text-m3-on-surface-variant">
            {t("management_career_paths.create_dialog.slug_help")}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_career_paths.create_dialog.description")}
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={t(
              "management_career_paths.create_dialog.description_placeholder",
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={create.isPending}
          >
            {t("management_career_paths.create_dialog.cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={create.isPending}
            className="gap-2"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("management_career_paths.create_dialog.submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ManagementCareerPathsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = usePermissions();

  // Career-path authoring is gated on course lifecycle codes on the backend
  // (see career_paths/routers/authoring.py _PATH_MANAGE_CODES), which the
  // manager role holds. There is no `career_path.manage` code in the catalog —
  // checking it here locked everyone but admins out of a surface the backend
  // already allows managers to use.
  //
  // Reading the catalogue is cheaper: HODs (course.read) may VIEW career
  // paths; only managers may create/edit them. The backend mirrors this
  // (list/detail/stages use _PATH_READ_CODES; mutations stay on the manage
  // set), so the UI gates the page on read and hides the create button when
  // the caller cannot manage.
  const canRead = permissions.hasAny("course.read", "system.administer");
  const canManage = permissions.hasAny(
    "course.create",
    "course.update",
    "system.administer",
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);

  // The status filter doubles as the archived toggle: picking "Archived"
  // asks the backend to include archived rows, then filters to them.
  const includeArchived = statusFilter === "archived";
  const enabled = !permissions.isLoading && canRead;
  const list = useListManagedCareerPaths({
    includeArchived,
    enabled,
  });

  const hasFilter = Boolean(search.trim() || statusFilter);

  const paths = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list.data ?? []).filter((p) => {
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.slug.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
  }, [list.data, search, statusFilter]);

  if (permissions.isLoading) {
    return <PageSkeleton rows={3} rounded="rounded-lg" className="pb-12" />;
  }

  if (!canRead) {
    return <PermissionDenied />;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t("management_career_paths.title")}
        subtitle={t("management_career_paths.subtitle")}
      />

      {list.isError ? (
        <div className="rounded-xl bg-m3-error-container border border-m3-error/20 p-6 text-center">
          <p className="text-m3-on-error-container text-sm font-semibold">
            {t("management_career_paths.list_load_failed")}
          </p>
        </div>
      ) : (
        <CareerPathsTable
          paths={paths}
          isLoading={list.isLoading}
          hasFilter={hasFilter}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          canManage={canManage}
          onOpen={(p) =>
            void navigate({
              to: "/management/career-paths/$id",
              params: { id: p.id },
            })
          }
          onCreate={() => setCreating(true)}
        />
      )}

      {creating && <CreateDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
