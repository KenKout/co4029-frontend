import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, type TabDef } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { STATUS_KEYS } from "./constants";
import type { SortKey, StatusFilter } from "./types";
import type { TeacherCoursesController } from "./use-courses-controller";

/**
 * Toolbar: search (own row) + status tabs + sort.
 *
 * The status buckets are a tab strip rather than a segmented control: they are
 * the primary way this list is sliced, and the per-status counts they carry are
 * the numbers the removed stat strip used to show in a separate box above. One
 * control now both reports and applies each count.
 */
export function CoursesToolbar({
  controller,
}: {
  controller: TeacherCoursesController;
}) {
  const { t } = useTranslation();
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sort,
    setSort,
    counts,
  } = controller;

  const tabs: TabDef<StatusFilter>[] = STATUS_KEYS.map((s) => ({
    key: s,
    label: t(`teacher_courses_list.filter_${s}`),
    count: counts[s],
  }));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant" />
        <Input
          placeholder={t("teacher_common.search_courses")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSearch("");
          }}
          className="pl-9 pr-9 h-10"
        />
        {search && (
          <Button variant="ghost"
            type="button"
            onClick={() => setSearch("")}
            aria-label={t("teacher_courses_list.clear_search", "Clear search")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-m3-on-surface-variant transition-colors hover:bg-m3-surface-container hover:text-m3-on-surface"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        {/* Status tabs — shared strip, per-status counts as badges. */}
        <Tabs
          variant="outlined"
          className="flex-1"
          ariaLabel={t("teacher_courses_list.filter_all")}
          value={statusFilter}
          onChange={setStatusFilter}
          tabs={tabs}
        />

        {/* Sort */}
        <label className="flex items-center gap-2 text-xs text-m3-on-surface-variant">
          {t("teacher_courses_list.sort_label", "Sort")}
          <Select<SortKey>
            value={sort}
            onValueChange={(next) => setSort(next)}
            size="sm"
            className="w-40"
            options={[
              {
                value: "recent",
                label: t("teacher_courses_list.sort_recent", "Newest first"),
              },
              {
                value: "oldest",
                label: t("teacher_courses_list.sort_oldest", "Oldest first"),
              },
              {
                value: "title",
                label: t("teacher_courses_list.sort_title", "Title (A–Z)"),
              },
            ]}
          />
        </label>
      </div>
    </div>
  );
}
