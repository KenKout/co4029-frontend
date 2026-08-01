import { SearchInput } from "@/components/ui/search-input";

import type { AdminCoursesController } from "./use-admin-courses";

/** Search box plus the include-deleted toggle. */
export function CoursesToolbar({ c }: { c: AdminCoursesController }) {
  const { t, table, includeDeleted, setIncludeDeleted } = c;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SearchInput
        wrapperClassName="max-w-md flex-1 min-w-[12rem]"
        value={table.search}
        onChange={(e) => table.setSearch(e.target.value)}
        placeholder={t("admin.courses_list.search_placeholder", {
          defaultValue: "Search by title or slug…",
        })}
        className="pl-10"
      />
      <label className="inline-flex items-center gap-2 text-sm text-text-strong select-none shrink-0">
        <input
          type="checkbox"
          checked={includeDeleted}
          onChange={(e) => setIncludeDeleted(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-m3-primary"
        />
        {t("admin.courses_list.include_deleted")}
      </label>
    </div>
  );
}
