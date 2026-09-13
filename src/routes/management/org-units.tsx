import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { BookOpen, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { OrgUnitTable } from "@/components/ui/org-unit-table";
import { usePermissions } from "@/lib/auth/use-permissions";
import { useOrgUnitsPage } from "./_components/org-units/use-org-units-page";
import { UnitFormDialog } from "./_components/org-units/UnitFormDialog";
import { UnitContentsPanel } from "./_components/org-units/UnitContentsPanel";
import { useUnitCounts } from "./_components/org-units/use-unit-assignment";
import { flattenOrgUnits } from "@/lib/org-unit-tree-helpers";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";

/** Edit/delete row actions for one Faculty (master-dean only). */
function UnitRowActions({
  node,
  t,
  onEdit,
  onDelete,
}: {
  node: OrgUnitNode;
  t: ReturnType<typeof useTranslation>["t"];
  onEdit: (node: OrgUnitNode) => void;
  onDelete: (node: OrgUnitNode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        title={t("common.edit")}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(node);
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
        title={t("common.delete")}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(node);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/** Top-level Faculty management and multi-Faculty staff affiliation. */
export default function ManagementOrgUnitsPage() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const c = useOrgUnitsPage();
  const { peopleCounts, courseCounts, programCounts } = useUnitCounts(
    c.orgId,
  );
  // Flat id → name map so a picker can show a person's other faculties.
  const unitsById = useMemo(
    () => new Map(flattenOrgUnits(c.nodes).map((u) => [u.id, u.name])),
    [c.nodes],
  );
  const deanFaculties = useMemo(
    () =>
      c.deanUnitIds
        .map((id) => ({ id, name: unitsById.get(id) }))
        .filter((row): row is { id: string; name: string } => Boolean(row.name)),
    [c.deanUnitIds, unitsById],
  );
  const prefix = "management_org_units";

  const canManage = permissions.hasAny("org_unit.manage", "system.administer");

  if (permissions.isLoading || c.isLoading) {
    return <PageSkeleton rows={5} rounded="rounded-lg" bg="bg-surface-muted" />;
  }
  if (!canManage) {
    return <PermissionDenied />;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t(`${prefix}.title`)}
        subtitle={t(`${prefix}.subtitle`)}
        action={
          c.isMasterDean ? (
            <Button size="sm" className="gap-2" onClick={() => c.openCreate()}>
              <Plus className="h-4 w-4" />
              {t(`${prefix}.new_root_unit`)}
            </Button>
          ) : undefined
        }
      />

      {c.isMasterDean ? (
        <div className="flex items-start gap-3 rounded-xl border border-m3-primary/25 bg-m3-primary-fixed/30 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-m3-primary" />
          <div>
            <p className="text-sm font-semibold text-text-strong">
              {t(`${prefix}.master_dean_scope_title`)}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {t(`${prefix}.master_dean_scope_description`)}
            </p>
          </div>
        </div>
      ) : deanFaculties.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-m3-primary/25 bg-m3-primary-fixed/30 p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-m3-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-strong">
              {t(`${prefix}.your_dean_scope_title`)}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {t(`${prefix}.your_dean_scope_description`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {deanFaculties.map((faculty) => (
              <Button
                key={faculty.id}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 bg-white text-xs"
                onClick={() => c.setSelectedId(faculty.id)}
              >
                {faculty.name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {c.isError ? (
        <div className="rounded-lg border border-border bg-surface-elev p-5">
          <p className="text-sm text-danger">{t(`${prefix}.load_failed`)}</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <OrgUnitTable
              nodes={c.nodes}
              selectedId={c.selectedId}
              onSelect={(node) => c.setSelectedId(node.id)}
              courseCounts={courseCounts}
              peopleCounts={peopleCounts}
              programCounts={programCounts}
              nameAdornment={(node) =>
                c.deanUnitIds.includes(node.id) ? (
                  <Badge
                    variant="outline"
                    className="border-m3-primary/30 bg-m3-primary-fixed/40 text-m3-primary"
                  >
                    <ShieldCheck />
                    {t(`${prefix}.you_are_dean`)}
                  </Badge>
                ) : null
              }
              emptyState={t(`${prefix}.empty_title`)}
              actions={
                c.isMasterDean
                  ? (node) => (
                      <UnitRowActions
                        node={node}
                        t={t}
                        onEdit={c.openEdit}
                        onDelete={c.setPendingDelete}
                      />
                    )
                  : undefined
              }
            />
          </div>

          <aside className="rounded-xl border border-border bg-surface-elev p-4">
            {c.selected ? (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-headline text-base font-bold text-text-strong">
                      {c.selected.name}
                    </p>
                    {c.deanUnitIds.includes(c.selected.id) ? (
                      <Badge className="bg-m3-primary text-white">
                        <ShieldCheck />
                        {t(`${prefix}.you_are_dean`)}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {t(`${prefix}.unit_types.${c.selected.unit_type}`, {
                      defaultValue: c.selected.unit_type,
                    })}
                    {c.selected.code ? ` · ${c.selected.code}` : ""}
                  </p>
                </div>
                {/* Faculty staff affiliation is many-to-many. Course Faculty
                    ownership is chosen once during create/import and is not
                    editable from this screen. */}
                <UnitContentsPanel
                  orgId={c.orgId}
                  unit={c.selected}
                  unitsById={unitsById}
                  isMasterDean={c.isMasterDean}
                  isDeanOfUnit={c.deanUnitIds.includes(c.selected.id)}
                />

                {/* Scope shortcuts — unlike the panel above these include the
                    whole subtree, the same way the permission engine reads
                    it. */}
                <div className="space-y-2 border-t border-border pt-4">
                  <Link
                    to="/management/courses"
                    search={{ unit: c.selected.id }}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-strong hover:bg-m3-surface-container-low"
                  >
                    <BookOpen className="h-4 w-4 text-m3-primary" />
                    {t(`${prefix}.view_courses`)}
                  </Link>
                  <Link
                    to="/management/users"
                    search={{ unit: c.selected.id }}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-strong hover:bg-m3-surface-container-low"
                  >
                    <Users className="h-4 w-4 text-m3-primary" />
                    {t(`${prefix}.view_users`)}
                  </Link>
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-text-muted">
                {t(`${prefix}.select_hint`)}
              </p>
            )}
          </aside>
        </div>
      )}

      <UnitFormDialog controller={c} />

      <ConfirmDialog
        open={c.pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) c.setPendingDelete(null);
        }}
        title={t(`${prefix}.delete_title`, {
          name: c.pendingDelete?.name ?? "",
        })}
        // Deleting cascades down the subtree, so the count is stated up
        // front rather than discovered afterwards.
        description={
          c.pendingDelete && c.pendingDelete.descendant_count > 0
            ? t(`${prefix}.delete_warning_subtree`, {
                count: c.pendingDelete.descendant_count,
              })
            : t(`${prefix}.delete_warning`)
        }
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={c.confirmDelete}
        isPending={c.isDeleting}
      />
    </div>
  );
}
