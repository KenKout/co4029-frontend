import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, BookOpen, GraduationCap, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  useCareerPaths,
  useMyCareerEnrollments,
} from "@/lib/api/hooks/career-paths";
import type { CareerPathPublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const CARD_GRADIENTS = [
  "from-blue-500 via-blue-700 to-blue-800",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-pink-500 via-rose-500 to-orange-500",
  "from-amber-500 via-orange-500 to-red-500",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-blue-500 via-blue-600 to-sky-500",
];

function PathCard({
  path,
  index,
  enrolled,
}: {
  path: CareerPathPublic;
  index: number;
  enrolled: boolean;
}) {
  const { t } = useTranslation();
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  return (
    <Link
      to="/catalog/career-paths/$slug"
      params={{ slug: path.slug }}
      className="group block"
    >
      <div className="bg-card rounded-xl overflow-hidden shadow-editorial ghost-border transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-glass h-full flex flex-col cursor-pointer">
        <div className="relative aspect-video overflow-hidden shrink-0">
          <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <Badge className="absolute top-3 left-3 z-10 bg-black/40 text-white border border-white/20 backdrop-blur-sm text-[10px] font-semibold tracking-wide">
            <Sparkles className="h-2.5 w-2.5 mr-1" />
            {t("career_paths_page.card_chip")}
          </Badge>
          {enrolled && (
            <Badge className="absolute top-3 right-3 z-10 bg-emerald-500/90 text-white border border-white/20 backdrop-blur-sm text-[10px] font-semibold tracking-wide">
              {t("career_paths_page.enrolled_badge")}
            </Badge>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-25 group-hover:opacity-40 transition-opacity">
            <GraduationCap className="h-16 w-16 text-white" />
          </div>
        </div>

        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="font-headline font-semibold text-sm text-m3-on-surface line-clamp-2 leading-snug">
              {path.name}
            </h3>
            {path.description && (
              <p className="text-xs text-m3-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
                {path.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-m3-on-surface-variant">
            <BookOpen className="h-3 w-3" />
            <span>
              {t("career_paths_page.n_courses", { count: path.courses.length })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl ghost-border overflow-hidden">
      <Skeleton className="aspect-video rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export default function CareerPathsPage() {
  const { t } = useTranslation();
  const list = useCareerPaths();
  const myEnrollments = useMyCareerEnrollments();

  // Only ACTIVE program enrollments mark a path as "enrolled": after a
  // switch the old attempt is switched_out and must not keep the badge.
  const enrolledIds = new Set(
    (myEnrollments.data ?? [])
      .filter((e) => e.status === "active")
      .map((e) => e.career_path_id),
  );
  const items = list.items;

  // Auto-load next page when the sentinel scrolls into view (mirrors
  // the InfiniteList pattern but inline because this is a CSS grid).
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchNextPageRef = useRef(list.fetchNextPage);
  fetchNextPageRef.current = list.fetchNextPage;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (!list.hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) fetchNextPageRef.current();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [list.hasNextPage, list.isFetchingNextPage]);

  return (
    <div className="relative min-h-screen pb-28">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="pt-2">
          <div className="flex items-center gap-3 mb-2">
            <AIInsightChip pulse>{t("career_paths_page.chip")}</AIInsightChip>
          </div>
          <h1 className="font-headline font-black text-4xl sm:text-5xl text-m3-on-surface leading-none tracking-tight">
            {t("career_paths_page.title")}
          </h1>
          <p className="mt-3 text-m3-on-surface-variant text-base sm:text-lg max-w-xl">
            {t("career_paths_page.intro")}
          </p>
        </header>

        <section className="space-y-5 pb-4">
          <SectionHeader
            title={t("career_paths_page.section_title")}
            subtitle={t("career_paths_page.section_subtitle")}
          />

          {list.isError && (
            <EmptyState
              icon={AlertCircle}
              title={t("career_paths_page.load_failed_title")}
              description={
                list.error instanceof Error
                  ? list.error.message
                  : t("career_paths_page.load_failed_body")
              }
              cta={
                <Button
                  variant="outline"
                  onClick={() => list.fetchNextPage()}
                  className="cursor-pointer"
                >
                  {t("career_paths_page.retry")}
                </Button>
              }
            />
          )}

          {list.isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!list.isLoading && !list.isError && items.length === 0 && (
            <EmptyState
              icon={GraduationCap}
              title={t("career_paths_page.empty_title")}
              description={t("career_paths_page.empty_body")}
            />
          )}

          {!list.isLoading && !list.isError && items.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {items.map((p, i) => (
                  <PathCard
                    key={p.id}
                    path={p}
                    index={i}
                    enrolled={enrolledIds.has(p.id)}
                  />
                ))}
              </div>
              <div ref={sentinelRef} className="h-10">
                {list.isFetchingNextPage && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-5">
                    {[1, 2, 3].map((i) => (
                      <SkeletonCard key={`next-${i}`} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

    </div>
  );
}
