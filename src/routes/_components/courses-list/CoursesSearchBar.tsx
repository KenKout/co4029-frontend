import { useTranslation } from "react-i18next";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Sticky search + clear-filters bar with the "n loaded / n of total" line.
 *
 * `sticky top-0 z-10` is the per-page sticky layer (see AGENTS.md) — it stays
 * below ContentTopBar's z-20.
 */
export function CoursesSearchBar({
  query,
  setQuery,
  clearFilters,
  isLoading,
  shownCount,
  totalCount,
}: {
  query: string;
  setQuery: (value: string) => void;
  clearFilters: () => void;
  isLoading: boolean;
  shownCount: number;
  totalCount: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 border-b border-m3-outline-variant/20">
      <div className="flex flex-col sm:flex-row gap-3 max-w-4xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-outline pointer-events-none" />
          <label htmlFor="courses-search" className="sr-only">
            {t("courses_list.search_label")}
          </label>
          <Input
            id="courses-search"
            placeholder={t("courses_list.search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-m3-surface-container-lowest ghost-border rounded-xl h-10 placeholder:text-m3-outline focus-visible:ring-m3-secondary/40"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          className="shrink-0 h-10 w-10 rounded-xl ghost-border bg-m3-surface-container-lowest relative"
          onClick={clearFilters}
          title={t("courses_list.clear_filters")}
          aria-label={t("courses_list.clear_filters")}
        >
          <SlidersHorizontal className="h-4 w-4 text-m3-on-surface-variant" />
        </Button>
      </div>

      {!isLoading && (
        <p className="text-xs text-m3-on-surface-variant mt-2">
          {shownCount === totalCount
            ? t("courses_list.n_loaded", { count: totalCount })
            : t("courses_list.n_of_total", {
                shown: shownCount,
                total: totalCount,
              })}
          {query && (
            <button
              onClick={clearFilters}
              className="cursor-pointer ml-2 text-m3-secondary underline underline-offset-2 hover:no-underline"
            >
              {t("courses_list.clear_all")}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
