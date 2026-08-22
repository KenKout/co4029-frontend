import { useTranslation } from "react-i18next";
import { LayoutGrid, List, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type CourseScope = "all" | "enrolled" | "completed";
export type CourseViewMode = "card" | "list";

const SCOPES: CourseScope[] = ["all", "enrolled", "completed"];

/**
 * Sticky search + scope tabs + view-mode toggle bar. The "n loaded / n of
 * total" counter deliberately sits OUTSIDE the sticky wrapper so it scrolls
 * away with the content.
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
  scope,
  setScope,
  viewMode,
  setViewMode,
}: {
  query: string;
  setQuery: (value: string) => void;
  clearFilters: () => void;
  isLoading: boolean;
  shownCount: number;
  totalCount: number;
  scope: CourseScope;
  setScope: (scope: CourseScope) => void;
  viewMode: CourseViewMode;
  setViewMode: (mode: CourseViewMode) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 border-b border-m3-outline-variant/20 bg-white/90 backdrop-blur-md">
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

        <div className="flex items-center gap-2 shrink-0">
          {/* Scope: All / Enrolled / Completed. Enrolled = active +
              completed (so finished courses stay reachable for review /
              practice); Completed isolates finished ones. */}
          <div
            role="tablist"
            aria-label={t("courses_list.scope_label")}
            className="inline-flex rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-lowest p-1 gap-1"
          >
            {SCOPES.map((s) => (
              <Button variant="ghost"
                key={s}
                type="button"
                role="tab"
                aria-selected={scope === s}
                onClick={() => setScope(s)}
                className={cn(
                  "h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                  scope === s
                    ? "bg-m3-primary text-white shadow-sm"
                    : "text-m3-on-surface-variant hover:bg-m3-surface-container",
                )}
              >
                {t(`courses_list.scope_${s}`)}
              </Button>
            ))}
          </div>

          {/* View mode toggle — replaces the old inert filter icon. */}
          <div
            role="group"
            aria-label={t("courses_list.view_label")}
            className="inline-flex rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-lowest p-1 gap-1"
          >
            <Button variant="ghost"
              type="button"
              aria-label={t("courses_list.view_cards")}
              title={t("courses_list.view_cards")}
              aria-pressed={viewMode === "card"}
              onClick={() => setViewMode("card")}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                viewMode === "card"
                  ? "bg-m3-primary text-white shadow-sm"
                  : "text-m3-on-surface-variant hover:bg-m3-surface-container",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant="ghost"
              type="button"
              aria-label={t("courses_list.view_list")}
              title={t("courses_list.view_list")}
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                viewMode === "list"
                  ? "bg-m3-primary text-white shadow-sm"
                  : "text-m3-on-surface-variant hover:bg-m3-surface-container",
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      </div>

      {!isLoading && (
        <p className="text-xs text-m3-on-surface-variant">
          {shownCount === totalCount
            ? t("courses_list.n_loaded", { count: totalCount })
            : t("courses_list.n_of_total", {
                shown: shownCount,
                total: totalCount,
              })}
          {(query || scope !== "all") && (
            <Button variant="link"
              onClick={clearFilters}
              className="cursor-pointer ml-2 text-m3-secondary underline underline-offset-2 hover:no-underline"
            >
              {t("courses_list.clear_all")}
            </Button>
          )}
        </p>
      )}
    </>
  );
}
