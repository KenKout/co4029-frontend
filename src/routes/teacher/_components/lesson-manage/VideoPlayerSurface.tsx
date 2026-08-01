import { useTranslation } from "react-i18next";
import { Play } from "lucide-react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { useFileDrop } from "@/lib/use-file-drop";
import { cn } from "@/lib/utils";

/**
 * The video surface of a video-type lesson: the vidstack player once a stream
 * exists, otherwise a drag-and-drop / click upload placeholder.
 */
export function VideoPlayerSurface({
  streamUrl,
  onVideoUpload,
  uploading,
  onPickFile,
}: {
  streamUrl?: string;
  onVideoUpload: (file: File) => Promise<void>;
  uploading?: boolean;
  /** Opens the hidden file input owned by the parent. */
  onPickFile: () => void;
}) {
  const { t } = useTranslation();
  // Drag-and-drop onto the empty-state placeholder (same flicker-proof drag
  // lifecycle as every other upload surface). Only active when there's no
  // video yet; once a video exists the player takes the space and the
  // Replace button is the affordance.
  const { dragging: videoDragging, dropProps: videoDropProps } = useFileDrop({
    onFile: (file) => {
      if (!uploading) void onVideoUpload(file);
    },
    disabled: uploading,
  });

  return streamUrl ? (
    <div className="rounded-xl overflow-hidden shadow-xl shadow-m3-primary/5 bg-black">
      <MediaPlayer
        src={{ src: streamUrl, type: "video/mp4" }}
        className="w-full aspect-video"
        load="play"
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} download={false} />
      </MediaPlayer>
    </div>
  ) : (
    <div
      {...videoDropProps}
      onClick={() => !uploading && onPickFile()}
      className={cn(
        "relative aspect-video rounded-xl overflow-hidden bg-m3-surface-container-highest shadow-xl shadow-m3-primary/5 cursor-pointer border-2 transition-colors",
        videoDragging
          ? "dropzone-spin-border"
          : "border-transparent hover:border-m3-secondary/40",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-m3-primary/20 via-m3-secondary/10 to-transparent" />
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, #5654a8 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-2xl">
          <Play className="h-8 w-8 text-m3-primary ml-1" fill="currentColor" />
        </div>
        <p className="text-sm text-m3-on-surface-variant font-medium">
          {videoDragging
            ? t("file_dropzone.drop_active")
            : t("teacher_lesson_manage.video.empty")}
        </p>
      </div>
    </div>
  );
}
