import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import {
  useCareerPaths,
  useMyCareerEnrollments,
} from "@/lib/api/hooks/career-paths";
import type { CareerPathPublic, MyCareerEnrollmentRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { slugGradient } from "@/routes/courses/_components/course-detail/helpers";
import { getApiErrorMessage } from "@/lib/api/error-codes";

export type CareerPathScope = "all" | "mine";

export function currentCareerPathEnrollments(
  enrollments: MyCareerEnrollmentRead[],
): Map<string, MyCareerEnrollmentRead> {
  return new Map(
    enrollments
      .filter((enrollment) => enrollment.status !== "dropped")
      .map((enrollment) => [enrollment.career_path_id, enrollment]),
  );
}

export function visibleCareerPaths(
  paths: CareerPathPublic[],
  enrollmentByPathId: Map<string, MyCareerEnrollmentRead>,
  scope: CareerPathScope,
): CareerPathPublic[] {
  const scoped =
    scope === "mine"
      ? paths.filter((path) => enrollmentByPathId.has(path.id))
      : paths;
  return [...scoped].sort(
    (left, right) =>
      Number(enrollmentByPathId.has(right.id)) -
      Number(enrollmentByPathId.has(left.id)),
  );
}

function PathCard({
  path,
  enrollment,
}: {
  path: CareerPathPublic;
  enrollment?: MyCareerEnrollmentRead;
}) {
  const { t } = useTranslation();
  const isMine = Boolean(enrollment);
  const progress = Math.round(
    Math.min(100, Math.max(0, enrollment?.overall_percent ?? 0)),
  );
  return (
    <Link
      to="/catalog/career-paths/$slug"
      params={{ slug: path.slug }}
      className="group block"
    >
      <div
        className={cn(
          "bg-card rounded-xl overflow-hidden shadow-editorial ghost-border transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-glass h-full flex flex-col cursor-pointer",
          isMine &&
            "ring-2 ring-m3-primary ring-offset-2 ring-offset-m3-surface shadow-glass",
        )}
      >
        <div className="relative aspect-video overflow-hidden shrink-0">
          {path.thumbnail_url ? (
            <img
              src={path.thumbnail_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br",
                slugGradient(path.slug),
              )}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <Badge className="absolute top-3 left-3 z-10 bg-black/40 text-white border border-white/20 backdrop-blur-sm text-[10px] font-semibold tracking-wide">
            <Sparkles className="h-2.5 w-2.5 mr-1" />
            {t("career_paths_page.card_chip")}
          </Badge>
          {isMine && (
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-1.5 bg-m3-primary px-3 py-2 text-xs font-bold text-white shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("career_paths_page.my_path_badge")}
            </div>
          )}
          {!path.thumbnail_url ? (
            <div className="absolute inset-0 flex items-center justify-center opacity-25 group-hover:opacity-40 transition-opacity">
              <GraduationCap className="h-16 w-16 text-white" />
            </div>
          ) : null}
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
          {enrollment && (
            <div className="rounded-lg bg-m3-primary-fixed/50 px-3 py-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-semibold">
                <span className="text-m3-primary">
                  {enrollment.status === "completed"
                    ? t("career_paths_page.completed")
                    : t("career_paths_page.your_progress")}
                </span>
                <span className="tabular-nums text-m3-on-surface">
                  {progress}%
                </span>
              </div>
              <GradientProgress
                value={progress}
                size="sm"
                variant={
                  enrollment.status === "completed" ? "success" : "primary"
                }
              />
            </div>
          )}
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

interface PathCatalogContentProps {
  error: unknown;
  enrollmentByPathId: Map<string, MyCareerEnrollmentRead>;
  fetchNextPage: () => unknown;
  isError: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  items: CareerPathPublic[];
  onShowAll: () => void;
  sentinelRef: RefObject<HTMLDivElement | null>;
  visibleItems: CareerPathPublic[];
}

function PathCatalogContent({
  error,
  enrollmentByPathId,
  fetchNextPage,
  isError,
  isFetchingNextPage,
  isLoading,
  items,
  onShowAll,
  sentinelRef,
  visibleItems,
}: PathCatalogContentProps) {
  const { t } = useTranslation();

  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t("career_paths_page.load_failed_title")}
        description={
          // `error.message` on an ApiError is the raw `API 500: {...}` body.
          getApiErrorMessage(error, t("career_paths_page.load_failed_body"))
        }
        cta={
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            className="cursor-pointer"
          >
            {t("career_paths_page.retry")}
          </Button>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={t("career_paths_page.empty_title")}
        description={t("career_paths_page.empty_body")}
      />
    );
  }

  if (visibleItems.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={t("career_paths_page.no_my_paths_title")}
        description={t("career_paths_page.no_my_paths_body")}
        cta={
          <Button variant="outline" onClick={onShowAll}>
            {t("career_paths_page.scope_all")}
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((path) => (
          <PathCard
            key={path.id}
            path={path}
            enrollment={enrollmentByPathId.get(path.id)}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="h-10">
        {isFetchingNextPage && (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((index) => (
              <SkeletonCard key={`next-${index}`} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function CareerPathsPage() {
  const { t } = useTranslation();
  const list = useCareerPaths();
  const myEnrollments = useMyCareerEnrollments();
  const [scope, setScope] = useState<CareerPathScope>("all");

  // Dropped/switched-out attempts belong to history, not the student's current
  // set. Completed paths remain theirs and should stay recognizable here.
  const enrollmentByPathId = useMemo(
    () => currentCareerPathEnrollments(myEnrollments.data ?? []),
    [myEnrollments.data],
  );
  const items = list.items;
  const visibleItems = useMemo(
    () => visibleCareerPaths(items, enrollmentByPathId, scope),
    [enrollmentByPathId, items, scope],
  );

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
            subtitle={
              scope === "mine"
                ? t("career_paths_page.my_paths_subtitle")
                : t("career_paths_page.section_subtitle")
            }
            action={
              enrollmentByPathId.size > 0 ? (
                <SegmentedFilter
                  ariaLabel={t("career_paths_page.scope_label")}
                  value={scope}
                  onChange={setScope}
                  options={[
                    {
                      key: "all",
                      label: t("career_paths_page.scope_all"),
                      count: items.length,
                    },
                    {
                      key: "mine",
                      label: t("career_paths_page.scope_mine"),
                      count: enrollmentByPathId.size,
                    },
                  ]}
                />
              ) : undefined
            }
          />

          <PathCatalogContent
            error={list.error}
            enrollmentByPathId={enrollmentByPathId}
            fetchNextPage={list.fetchNextPage}
            isError={list.isError}
            isFetchingNextPage={list.isFetchingNextPage}
            isLoading={list.isLoading}
            items={items}
            onShowAll={() => setScope("all")}
            sentinelRef={sentinelRef}
            visibleItems={visibleItems}
          />
        </section>
      </div>
    </div>
  );
}
