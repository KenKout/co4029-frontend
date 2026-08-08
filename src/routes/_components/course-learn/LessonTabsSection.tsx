import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ApiError } from "@/lib/api/client";
import { useResourceDownloadUrl } from "@/lib/api/hooks/courses";
import { LessonDiscussionPanel } from "@/routes/_components/LessonDiscussionPanel";
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
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-m3-outline-variant/20">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((tab) => (
            <Button variant="ghost"
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 h-auto whitespace-normal",
                activeTab === tab
                  ? "bg-m3-secondary text-white shadow-ai-glow"
                  : "text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-surface-container",
              )}
            >
              {tab}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl ghost-border text-xs font-bold"
            onClick={onPrev}
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {hasPrev ? (
              <span className="max-w-[120px] truncate">{prevLabel}</span>
            ) : (
              "Previous"
            )}
          </Button>
          <Button
            size="sm"
            className="rounded-xl gradient-primary text-white text-xs font-bold flex items-center gap-1.5"
            onClick={onNext}
            disabled={!hasNext}
          >
            {hasNext ? (
              <span className="max-w-[120px] truncate">Next: {nextLabel}</span>
            ) : (
              "Finished"
            )}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="pb-4">
        {activeTab === "Lesson Notes" && (
          <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-m3-secondary" />
              <h4 className="font-headline font-bold text-m3-on-surface text-sm">
                Lesson Notes
              </h4>
            </div>
            <p className="text-m3-on-surface-variant text-sm leading-relaxed">
              Lesson notes will appear here once the material is processed.
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
  return (
    <GlassCard className="p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        <Download className="h-4 w-4 text-m3-secondary" />
        <h4 className="font-headline font-bold text-m3-on-surface text-sm">
          Downloadable Resources
        </h4>
        {resources && (
          <span className="ml-auto text-xs text-m3-on-surface-variant">
            {resources.length} file{resources.length !== 1 ? "s" : ""}
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
            No resources for this lesson
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
