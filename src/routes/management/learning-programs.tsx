import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { GraduationCap, LayoutGrid, Plus, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import {
  DataTableToolbar,
  type FilterDef,
} from "@/components/ui/data-table-toolbar";
import { Tabs, type TabDef } from "@/components/ui/tabs";
import { useManagedLearningPrograms } from "@/lib/api/hooks/learning-programs";
import type { LearningProgram } from "@/lib/api/types";
import { usePermissions } from "@/lib/auth/use-permissions";

import { ProgramCard } from "./_components/learning-programs/ProgramCard";
import { ProgramTable } from "./_components/learning-programs/ProgramTable";
import {
  useProgramView,
  type ProgramView,
} from "./_components/learning-programs/use-program-view";

export function filterManagedLearningPrograms(
  programs: LearningProgram[],
  search: string,
  statusFilter?: LearningProgram["status"],
): LearningProgram[] {
  const q = search.trim().toLowerCase();
  return programs.filter((program) => {
    if (
      statusFilter
        ? program.status !== statusFilter
        : program.status === "archived"
    ) {
      return false;
    }
    return (
      !q ||
      program.name.toLowerCase().includes(q) ||
      program.slug.toLowerCase().includes(q)
    );
  });
}

/**
 * Learning programs, browsable two ways.
 *
 * Cards answer "which program is this" — a manager scanning for one they
 * recognise. The table answers "how do these compare" — which holds the
 * most students, which has a revision in flight, which is sitting on
 * change requests. Those are different tasks and neither view serves both
 * well, so the choice is the manager's and it is remembered.
 *
 * One search toolbar sits above whichever view is active and filters both,
 * so switching view neither loses the filter nor hides the box it was
 * typed into.
 */
export default function ManagementLearningProgramsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const programs = useManagedLearningPrograms();
  const [view, setView] = useProgramView();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    LearningProgram["status"] | undefined
  >();

  const canRead = permissions.hasAny(
    "learning_program.read",
    "learning_program.manage",
  );
  const canManage = permissions.has("learning_program.manage");
  // The pending path-change-request count is review work: only the dean
  // (learning_program.switch.review) sees it. The count itself is not
  // sensitive — the REVIEW SURFACE is.
  const isDean = permissions.has("learning_program.switch.review");

  const filtered = useMemo(
    () =>
      filterManagedLearningPrograms(programs.data ?? [], search, statusFilter),
    [programs.data, search, statusFilter],
  );

  const statusFilters: FilterDef[] = [
    {
      id: "status",
      label: t("management_learning_programs.status"),
      allLabel: t("management_learning_programs.all_statuses"),
      options: [
        {
          value: "draft",
          label: t("management_learning_program_detail.status.draft"),
        },
        {
          value: "published",
          label: t("management_learning_program_detail.status.published"),
        },
        {
          value: "archived",
          label: t("management_learning_program_detail.status.archived"),
        },
      ],
    },
  ];

  const hasFilter = Boolean(search.trim() || statusFilter);

  if (permissions.isLoading || programs.isLoading)
    return <PageSkeleton rows={4} />;
  if (!canRead) return <PermissionDenied />;

  const viewTabs: TabDef<ProgramView>[] = [
    {
      key: "card",
      label: t("management_learning_programs.cards"),
      icon: LayoutGrid,
      labelHiddenOnMobile: true,
    },
    {
      key: "table",
      label: t("management_learning_programs.table"),
      icon: Table2,
      labelHiddenOnMobile: true,
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title={t("management_learning_programs.title")}
        subtitle={t("management_learning_programs.subtitle")}
        action={
          <div className="flex items-center gap-2">
            <Tabs
              tabs={viewTabs}
              value={view}
              onChange={setView}
              variant="contained"
              ariaLabel={t("management_learning_programs.view_aria")}
            />
            {canManage ? (
              <Button
                className="gap-2"
                onClick={() =>
                  void navigate({ to: "/management/learning-programs/new" })
                }
              >
                <Plus className="h-4 w-4" />
                {t("management_learning_programs.new_program")}
              </Button>
            ) : null}
          </div>
        }
      />

      {(programs.data ?? []).length === 0 && !statusFilter ? (
        <EmptyState
          icon={GraduationCap}
          title={t("management_learning_programs.empty_title")}
          description={t("management_learning_programs.empty_description")}
        />
      ) : (
        <div className="space-y-4">
          {/* One toolbar above whichever view is active, rather than the
              table owning its own. Switching view keeps both the filter and
              the box you typed it into — a filter you cannot see makes the
              list lie about how many programs exist. */}
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("management_learning_programs.search")}
            filters={statusFilters}
            filterValues={{ status: statusFilter }}
            onFilterChange={(filterId, value) => {
              if (filterId === "status") {
                setStatusFilter(value as LearningProgram["status"] | undefined);
              }
            }}
            onResetAllFilters={() => {
              setSearch("");
              setStatusFilter(undefined);
            }}
            clearLabel={t("management_learning_programs.clear_filters")}
          />

          {view === "table" ? (
            <ProgramTable
              programs={filtered}
              canManage={canManage}
              isDean={isDean}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  canManage={canManage}
                  isDean={isDean}
                />
              ))}
            </div>
          )}

          {/* A filtered result with no matches is not an empty program list —
              the table's own empty state would say "No Learning Programs",
              which reads as data loss rather than as a narrow filter. */}
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-m3-on-surface-variant">
              {hasFilter
                ? t("management_learning_programs.no_filter_match")
                : t("management_learning_programs.no_view_match")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
