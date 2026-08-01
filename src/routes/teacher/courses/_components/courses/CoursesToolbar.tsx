import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { Select } from "@/components/ui/select";

import { STATUS_KEYS } from "./constants";
import type { SortKey } from "./types";
import type { TeacherCoursesController } from "./use-courses-controller";

/**
 * Toolbar: search (own row) + status segmented control + sort. Extracted
 * verbatim from the former 234-line courses.tsx.
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
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label={t("teacher_courses_list.clear_search", "Clear search")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-m3-on-surface-variant transition-colors hover:bg-m3-surface-container hover:text-m3-on-surface"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status segmented control — shared component, per-status counts. */}
        <SegmentedFilter
          ariaLabel={t("teacher_courses_list.filter_all")}
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_KEYS.map((s) => ({
            key: s,
            label: t(`teacher_courses_list.filter_${s}`),
            count: counts[s],
          }))}
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
