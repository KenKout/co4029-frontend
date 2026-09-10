import { useTranslation } from "react-i18next";
import { LayoutGrid, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Tabs, type TabDef } from "@/components/ui/tabs";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";

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
    viewMode,
    setViewMode,
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

        {/* View mode + sort. The toggle mirrors the student catalogue's
            segmented control (courses_list.view_* strings are shared). */}
        <div className="flex items-center gap-3">
          <div
            role="group"
            aria-label={t("courses_list.view_label")}
            className="inline-flex gap-1 rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-lowest p-1"
          >
            <Button
              variant="ghost"
              type="button"
              aria-label={t("courses_list.view_cards")}
              title={t("courses_list.view_cards")}
              aria-pressed={viewMode === "card"}
              onClick={() => setViewMode("card")}
              className={cn(
                "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors",
                viewMode === "card"
                  ? "bg-m3-primary text-white shadow-sm hover:bg-m3-primary/90 hover:text-white"
                  : "text-m3-on-surface-variant hover:bg-m3-surface-container",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              type="button"
              aria-label={t("courses_list.view_list")}
              title={t("courses_list.view_list")}
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={cn(
                "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors",
                viewMode === "list"
                  ? "bg-m3-primary text-white shadow-sm hover:bg-m3-primary/90 hover:text-white"
                  : "text-m3-on-surface-variant hover:bg-m3-surface-container",
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

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
    </div>
  );
}
