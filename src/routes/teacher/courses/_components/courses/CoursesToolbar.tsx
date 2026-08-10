import { useTranslation } from "react-i18next";

import { Select } from "@/components/ui/select";
import { Tabs, type TabDef } from "@/components/ui/tabs";
import { SearchInput } from "@/components/ui/search-input";
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
      <SearchInput
        placeholder={t("teacher_common.search_courses")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setSearch("");
        }}
        onClear={search ? () => setSearch("") : undefined}
        clearLabel={t("teacher_courses_list.clear_search", "Clear search")}
        wrapperClassName="relative"
        className="h-10"
      />

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
