import { CheckCircle2, Loader2, Maximize2, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import type { CuratedPublishController } from "./use-curated-publish";

/**
 * Action row above the preview: publish (or "Save and publish"), the published
 * marker, and expand. Extracted verbatim from the former 1422-line
 * material-hub.tsx.
 */
export function KgPreviewToolbar({
  publish,
  onExpand,
}: {
  publish: CuratedPublishController;
  onExpand: () => void;
}) {
  const { t } = useTranslation();
  const {
    curatedData,
    canPublish,
    isFullyPublished,
    needsSaveBeforePublish,
    publishBusy,
    setConfirmPublish,
  } = publish;

  return (
    <div className="flex items-center justify-end gap-2">
      {/* No title here: the lesson page already renders a "Knowledge Graph"
          section heading directly above this card, so repeating it (with the
          brain icon) read as a duplicate. */}
      {/* Expand → full-screen detail screen, which is where the AI/Curated
          source toggle and Edit live (so viewing and editing are two modes of
          one screen). Always available: even with no AI graph, the teacher can
          open it and switch to Curated to author one from scratch. */}
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Publish the curated graph straight from the lesson page, without
            opening the editor. Shown whenever there's a graph with nodes —
            including a never-saved AI-seeded one, which we save on the way
            through (label becomes "Save and publish").

            Once the live snapshot matches the draft there is nothing to do, so
            the button gives way to a static "Published" marker rather than
            inviting a pointless re-publish. */}
        {canPublish && !isFullyPublished && (
          <button
            type="button"
            onClick={() => setConfirmPublish(true)}
            disabled={publishBusy}
            title={t("teacher_lesson_materials.kg.publish_title")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
              needsSaveBeforePublish
                ? "bg-m3-primary text-white hover:bg-m3-primary/90"
                : "bg-m3-surface-container text-m3-on-surface-variant hover:text-m3-primary",
              publishBusy && "opacity-60",
            )}
          >
            {publishBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {needsSaveBeforePublish
              ? t("teacher_lesson_materials.kg.save_and_publish")
              : t("teacher_lesson_materials.kg.publish")}
          </button>
        )}
        {isFullyPublished && (
          <span
            title={
              curatedData?.published_at
                ? t("teacher_lesson_materials.kg.published_at", {
                    date: new Date(curatedData.published_at).toLocaleString(),
                  })
                : undefined
            }
            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("teacher_lesson_materials.kg.published_badge")}
          </span>
        )}
        <button
          type="button"
          onClick={onExpand}
          aria-label={t("teacher_lesson_materials.kg.expand")}
          title={t("teacher_lesson_materials.kg.expand")}
          className="rounded-lg p-1.5 text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary transition-colors cursor-pointer"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
