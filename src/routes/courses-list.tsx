import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "@/components/ui/section-header";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { useCourses } from "@/lib/api/hooks/courses";
import {
  CoursesGrid,
  CoursesLoadError,
  CoursesSkeletonGrid,
} from "@/routes/_components/courses-list/CoursesGrid";
import { CoursesSearchBar } from "@/routes/_components/courses-list/CoursesSearchBar";

/**
 * Public course catalogue. The card, sticky search bar and grid live in
 * `_components/courses-list/`; this file owns the query and the client-side
 * title/description/slug filter.
 */
export default function CoursesListPage() {
  const { t } = useTranslation();
  const {
    items,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useCourses(20);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [items, query]);

  function clearFilters() {
    setQuery("");
  }

  return (
    <div className="relative min-h-screen pb-28">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="pt-2">
          <div className="flex items-center gap-3 mb-2">
            <AIInsightChip pulse>{t("courses_list.ai_chip")}</AIInsightChip>
          </div>
          <h1 className="font-headline font-black text-4xl sm:text-5xl text-m3-on-surface leading-none tracking-tight">
            {t("courses_list.title")}
          </h1>
          <p className="mt-3 text-m3-on-surface-variant text-base sm:text-lg max-w-xl">
            {t("courses_list.intro")}
          </p>
        </header>

        <CoursesSearchBar
          query={query}
          setQuery={setQuery}
          clearFilters={clearFilters}
          isLoading={isLoading}
          shownCount={filtered.length}
          totalCount={items.length}
        />

        <section className="space-y-5 pb-4">
          <SectionHeader
            title={t("courses_list.section_title")}
            subtitle={t("courses_list.section_subtitle")}
          />

          {isError && <CoursesLoadError error={error} />}

          {isLoading && <CoursesSkeletonGrid />}

          {!isLoading && !isError && (
            <CoursesGrid
              filtered={filtered}
              query={query}
              totalCount={items.length}
              clearFilters={clearFilters}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
          )}
        </section>
      </div>
    </div>
  );
}
