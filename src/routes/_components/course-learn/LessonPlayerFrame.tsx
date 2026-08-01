import type { RefObject } from "react";
import { Play } from "lucide-react";
import { useStreamUrl } from "@/lib/api/hooks/materials";
import { useLessonEngagementTracker } from "@/lib/hooks/useLessonEngagementTracker";
import type { LessonPublic } from "@/lib/api/types";

/**
 * The video surface. `showPlayButton` is what separates the "a lesson is
 * loaded" frame from the empty placeholder frame — the container itself is
 * identical in both, and both carry the deep-link seek target ref.
 */
export function LessonPlayerFrame({
  containerRef,
  showPlayButton = false,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  showPlayButton?: boolean;
}) {
  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden bg-black shadow-2xl"
      data-testid="course-learn-player"
    >
      <div className="relative aspect-video">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-900 to-slate-900 opacity-80" />
        {showPlayButton && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-m3-primary/90 text-white rounded-full flex items-center justify-center shadow-2xl">
              <Play className="h-9 w-9 fill-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function VideoEngagementTracker({
  lesson,
  courseId,
}: {
  lesson: LessonPublic;
  courseId: string;
}) {
  // Video lessons share the same primary_material_id pattern as reading
  // lessons; we resolve the version via the same stream-url endpoint and
  // emit engagement on the same heartbeat schedule. The actual <video>
  // playback events (play/pause/timeupdate) would refine this, but the
  // current course-learn pane is a placeholder, so a presence-based
  // heartbeat is the most we can faithfully report.
  const materialId = lesson.primary_material_id ?? null;
  const streamQuery = useStreamUrl(materialId);
  const materialVersionId = streamQuery.data?.material_version_id ?? null;

  useLessonEngagementTracker({
    materialVersionId,
    lessonId: lesson.id,
    courseId,
  });

  return null;
}
