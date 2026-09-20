import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ApiError } from "@/lib/api/client";
import { useResourceDownloadUrl } from "@/lib/api/hooks/courses";
import { LessonDiscussionPanel } from "@/routes/courses/_components/LessonDiscussionPanel";
import type { LessonResourcePublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { TABS } from "./constants";
import type { Tab } from "./types";

/**
 * The below-the-player strip: tab switcher, prev/next lesson navigation, and
 * the active tab's panel.
 */
export function LessonTabsSection({
  activeTab,
  onTabChange,
  activeLessonId,
  resources,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  activeLessonId: string | undefined;
  resources: LessonResourcePublic[] | undefined;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string | undefined;
  nextLabel: string | undefined;
}) {
  const { t } = useTranslation();
  const tabLabels: Record<Tab, string> = {
    "Lesson Notes": t("course_learn.tabs.notes"),
    Discussion: t("course_learn.tabs.discussion"),
    Resources: t("course_learn.tabs.resources"),
  };

  return (
    <>
      <div className="flex flex-col justify-between gap-4 border-t border-m3-outline-variant/20 pt-4 md:flex-row md:items-center">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <Button
              variant="ghost"
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                "h-auto shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200",
                activeTab === tab
                  ? "bg-m3-secondary text-white shadow-ai-glow"
                  : "text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-surface-container",
              )}
            >
              {tabLabels[tab]}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 md:shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 rounded-xl ghost-border px-2 text-xs font-bold sm:px-3"
            onClick={onPrev}
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {hasPrev ? (
              <span className="min-w-0 truncate sm:max-w-[120px]">
                {prevLabel}
              </span>
            ) : (
              t("common.previous")
            )}
          </Button>
          <Button
            size="sm"
            className="flex min-w-0 items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-white gradient-primary sm:px-3"
            onClick={onNext}
            disabled={!hasNext}
          >
            {hasNext ? (
              <span className="min-w-0 truncate sm:max-w-[120px]">
                {t("course_learn.next_lesson", { title: nextLabel })}
              </span>
            ) : (
              t("course_learn.finished")
            )}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="pb-4">
        {activeTab === "Lesson Notes" && (
          <GlassCard className="p-4 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-m3-secondary" />
              <h4 className="font-headline font-bold text-m3-on-surface text-sm">
                {t("course_learn.lesson_notes")}
              </h4>
            </div>
            <p className="text-m3-on-surface-variant text-sm leading-relaxed">
              {t("course_learn.lesson_notes_pending")}
            </p>
          </GlassCard>
        )}

        {activeTab === "Discussion" &&
          (activeLessonId ? (
            <LessonDiscussionPanel lessonId={activeLessonId} />
          ) : null)}

        {activeTab === "Resources" && <ResourcesPanel resources={resources} />}
      </div>
    </>
  );
}

function ResourcesPanel({
  resources,
}: {
  resources: LessonResourcePublic[] | undefined;
}) {
  const { t } = useTranslation();

  return (
    <GlassCard className="p-4 sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        <Download className="h-4 w-4 text-m3-secondary" />
        <h4 className="font-headline font-bold text-m3-on-surface text-sm">
          {t("course_learn.downloadable_resources")}
        </h4>
        {resources && (
          <span className="ml-auto text-xs text-m3-on-surface-variant">
            {t("course_learn.resource_count", { count: resources.length })}
          </span>
        )}
      </div>

      {!resources ? (
        <PageSkeleton rows={2} height="h-12" gap="space-y-2" />
      ) : resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-m3-surface-container flex items-center justify-center">
            <FileText className="h-5 w-5 text-m3-outline" />
          </div>
          <p className="text-sm font-semibold text-m3-on-surface">
            {t("course_learn.no_resources")}
          </p>
        </div>
      ) : (
        resources.map((file) => <ResourceRow key={file.id} resource={file} />)
      )}
    </GlassCard>
  );
}

function ResourceRow({ resource }: { resource: LessonResourcePublic }) {
  const { t } = useTranslation();
  const [requested, setRequested] = useState(false);
  const downloadQuery = useResourceDownloadUrl(
    requested ? resource.id : undefined,
  );
  const downloadUnavailable =
    downloadQuery.isError &&
    downloadQuery.error instanceof ApiError &&
    downloadQuery.error.status === 404;

  useEffect(() => {
    if (downloadQuery.data?.url && requested) {
      window.open(downloadQuery.data.url, "_blank", "noopener,noreferrer");
      setRequested(false);
    }
  }, [downloadQuery.data, requested]);

  return (
    <div className="flex items-center gap-3 py-3 border-b border-m3-outline-variant/15 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-m3-secondary/10 flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4 text-m3-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {resource.title}
        </p>
        <p className="text-[10px] text-m3-outline uppercase">
          {resource.resource_type}
        </p>
        {downloadUnavailable && (
          <p className="text-[10px] text-amber-600 mt-0.5">
            {t("course_learn.resource_unavailable")}
          </p>
        )}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-xl text-m3-secondary hover:bg-m3-secondary/10"
        title={
          downloadUnavailable
            ? t("course_learn.resource_unavailable")
            : t("course_learn.download")
        }
        onClick={() => setRequested(true)}
        disabled={downloadQuery.isFetching}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
