import type { RefObject } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import { useStreamUrl } from "@/lib/api/hooks/materials";
import { useLessonEngagementTracker } from "@/lib/hooks/useLessonEngagementTracker";
import type { LessonPublic } from "@/lib/api/types";

/** Empty lesson placeholder that retains the deep-link seek target. */
export function LessonPlayerFrame({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl bg-black shadow-2xl"
      data-testid="course-learn-player"
    >
      <div className="aspect-video bg-gradient-to-br from-blue-900 via-blue-900 to-slate-900" />
    </div>
  );
}

/** Resolves the signed lesson stream and renders an interactive video player. */
export function LessonVideoPlayer({
  lesson,
  courseId,
  containerRef,
}: {
  lesson: LessonPublic;
  courseId: string;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation();
  const streamQuery = useStreamUrl(lesson.primary_material_id ?? null);
  const materialVersionId = streamQuery.data?.material_version_id ?? null;

  useLessonEngagementTracker({
    materialVersionId,
    lessonId: lesson.id,
    courseId,
  });

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl bg-black shadow-2xl"
      data-testid="course-learn-player"
    >
      {streamQuery.isLoading ? (
        <div className="flex aspect-video items-center justify-center gap-3 text-sm text-white/80">
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>{t("course_learn.video_loading")}</span>
        </div>
      ) : streamQuery.data?.url ? (
        <MediaPlayer
          src={streamQuery.data.url}
          className="aspect-video w-full"
          load="play"
        >
          <MediaProvider />
          <DefaultVideoLayout icons={defaultLayoutIcons} download={false} />
        </MediaPlayer>
      ) : (
        <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-white/80">
          {t("course_learn.video_unavailable")}
        </div>
      )}
    </div>
  );
}
