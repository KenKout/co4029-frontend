import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { VideoPlayerSurface } from "./VideoPlayerSurface";
import { VideoUploadRow } from "./VideoUploadRow";
import { VideoLessonNotes } from "./VideoLessonNotes";
import { LessonEditorSection } from "./LessonEditorSection";

/**
 * Video-type lesson content: the video player (or a drag-and-drop upload
 * placeholder when empty), a replace/upload button, and the markdown lesson-
 * notes editor with its formatting toolbar.
 */
export function VideoContent({
  notes,
  setNotes,
  notesRef,
  estimatedMinutes,
  streamUrl,
  onVideoUpload,
  uploading,
}: {
  notes: string;
  setNotes: (v: string) => void;
  notesRef: React.RefObject<HTMLTextAreaElement | null>;
  estimatedMinutes: string;
  streamUrl?: string;
  onVideoUpload: (file: File) => Promise<void>;
  uploading?: boolean;
}) {
  const { t } = useTranslation();
  const videoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-10">
      <LessonEditorSection>
        <div>
          <h2 className="font-headline text-2xl font-bold text-m3-primary">
            {t("teacher_lesson_manage.sections.video_content")}
          </h2>
          <p className="mt-0.5 text-sm text-m3-on-surface-variant">
            {t("teacher_lesson_manage.sections.video_content_hint")}
          </p>
        </div>

        <VideoPlayerSurface
          streamUrl={streamUrl}
          onVideoUpload={onVideoUpload}
          uploading={uploading}
          onPickFile={() => videoInputRef.current?.click()}
        />

        <VideoUploadRow
          estimatedMinutes={estimatedMinutes}
          streamUrl={streamUrl}
          uploading={uploading}
          onPickFile={() => videoInputRef.current?.click()}
        />

        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void onVideoUpload(file);
              e.target.value = "";
            }
          }}
        />
      </LessonEditorSection>

      <VideoLessonNotes notes={notes} setNotes={setNotes} notesRef={notesRef} />
    </div>
  );
}
