import { useRef } from "react";
import { VideoPlayerSurface } from "./VideoPlayerSurface";
import { VideoUploadRow } from "./VideoUploadRow";
import { VideoLessonNotes } from "./VideoLessonNotes";

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
  const videoInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
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
            onVideoUpload(file);
            e.target.value = "";
          }
        }}
      />

      <VideoLessonNotes notes={notes} setNotes={setNotes} notesRef={notesRef} />
    </>
  );
}
