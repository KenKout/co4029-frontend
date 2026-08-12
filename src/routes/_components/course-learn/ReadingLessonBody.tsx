import { ExternalLink, FileText, Maximize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import type { LessonPublic } from "@/lib/api/types";
import type { Translate } from "./types";

// iOS Safari does not render PDFs inside iframes at all (long-standing
// WebKit behaviour — desktop Chrome/Firefox/Edge and Android Chrome do), so
// the inline preview shows blank there. iPadOS 13+ reports as Mac, hence the
// maxTouchPoints check.
const IS_IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/**
 * Contents of the reading-lesson card: header, summary, the material iframe (or
 * its loading / unavailable stand-ins) and the authored notes.
 *
 * `t` is threaded in from the pane rather than read from context here so the
 * pane keeps owning the i18n subscription it always had.
 */
export function ReadingLessonBody({
  lesson,
  materialId,
  streamUrl,
  isLoading,
  t,
}: {
  lesson: LessonPublic;
  materialId: string | null;
  streamUrl: string | null;
  isLoading: boolean;
  t: Translate;
}) {
  const hasNotes = Boolean(
    lesson.notes_markdown && lesson.notes_markdown.trim().length > 0,
  );
  const hasMaterial = Boolean(materialId);

  const openFullscreen = () => {
    if (streamUrl) {
      window.open(streamUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-m3-secondary" />
          <span className="text-xs font-headline font-semibold uppercase tracking-wider text-m3-on-surface-variant">
            {t("course_learn.reading_lesson")}
          </span>
        </div>
        {streamUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={openFullscreen}
            className="rounded-xl text-xs font-bold gap-1.5 text-m3-on-surface-variant hover:text-m3-primary"
            data-testid="course-learn-reading-fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            {t("course_learn.reading_open_fullscreen")}
          </Button>
        )}
      </div>

      {lesson.summary && (
        <p className="text-sm text-m3-on-surface-variant leading-relaxed">
          {lesson.summary}
        </p>
      )}

      {hasMaterial &&
        (isLoading ? (
          <div className="h-[600px] rounded-xl bg-m3-surface-container-low animate-pulse" />
        ) : streamUrl ? (
          IS_IOS ? (
            <div className="mt-2 rounded-xl border border-dashed border-m3-outline-variant/40 p-6 text-center space-y-3">
              <p className="text-sm text-m3-on-surface-variant leading-relaxed">
                {t("course_learn.reading_preview_unavailable")}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={openFullscreen}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {t("course_learn.reading_open_fullscreen")}
              </Button>
            </div>
          ) : (
            <div className="mt-2 rounded-xl overflow-hidden border border-m3-outline-variant/30">
              <iframe
                src={streamUrl}
                title={lesson.title}
                className="w-full h-[600px] bg-white"
                data-testid="course-learn-reading-iframe"
              />
            </div>
          )
        ) : (
          <div className="rounded-xl border border-dashed border-m3-outline-variant/40 p-6 text-sm text-m3-on-surface-variant">
            {t("course_learn.reading_material_unavailable")}
          </div>
        ))}

      {hasNotes && (
        <article className="prose prose-sm max-w-none prose-headings:font-headline prose-headings:text-m3-on-surface prose-p:text-m3-on-surface-variant prose-a:text-m3-primary">
          <ReactMarkdown>{lesson.notes_markdown ?? ""}</ReactMarkdown>
        </article>
      )}

      {!hasMaterial && !hasNotes && (
        <p className="text-sm text-m3-on-surface-variant">
          {t("course_learn.reading_empty")}
        </p>
      )}
    </>
  );
}
