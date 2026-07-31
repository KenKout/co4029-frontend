import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Play,
  Upload,
  Loader2,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Code,
  Image,
} from "lucide-react";
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
import { ToolbarBtn, makeMarkdownApplier } from "./markdown-editor";

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
  const { applyMarkdown, applyBlock } = makeMarkdownApplier(
    () => notesRef.current,
    () => notes,
    setNotes,
  );
  const videoInputRef = useRef<HTMLInputElement>(null);
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

  return (
    <>
      {streamUrl ? (
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
          onClick={() => !uploading && videoInputRef.current?.click()}
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
              <Play
                className="h-8 w-8 text-m3-primary ml-1"
                fill="currentColor"
              />
            </div>
            <p className="text-sm text-m3-on-surface-variant font-medium">
              {videoDragging
                ? t("file_dropzone.drop_active")
                : t("teacher_lesson_manage.video.empty")}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        {estimatedMinutes && (
          <span className="text-xs text-m3-on-surface-variant font-medium">
            <span className="font-bold text-m3-on-surface">
              {estimatedMinutes}
            </span>{" "}
            min estimated
          </span>
        )}
        <button
          type="button"
          disabled={uploading}
          onClick={() => videoInputRef.current?.click()}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-m3-outline-variant/30 bg-m3-surface hover:bg-m3-surface-container transition-colors cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading
            ? "Uploading…"
            : streamUrl
              ? "Replace Video"
              : "Upload Video"}
        </button>
      </div>

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

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-bold text-2xl text-m3-primary">
            Lesson Notes
          </h2>
          <div className="flex items-center gap-1 p-1.5 bg-m3-surface-container-low rounded-xl">
            <ToolbarBtn
              icon={Bold}
              label="Bold"
              onClick={() => applyMarkdown("**")}
            />
            <ToolbarBtn
              icon={Italic}
              label="Italic"
              onClick={() => applyMarkdown("*")}
            />
            <span className="w-px h-4 bg-m3-outline-variant/30 mx-0.5" />
            <ToolbarBtn
              icon={List}
              label="Bullet List"
              onClick={() => applyBlock("- ")}
            />
            <ToolbarBtn
              icon={LinkIcon}
              label="Insert Link"
              onClick={() => applyMarkdown("[", "](url)")}
            />
            <ToolbarBtn
              icon={Code}
              label="Inline Code"
              onClick={() => applyMarkdown("`")}
            />
            <ToolbarBtn
              icon={Image}
              label="Insert Image"
              onClick={() => applyMarkdown("![alt](", ")")}
            />
          </div>
        </div>
        <textarea
          ref={notesRef}
          className="min-h-[400px] w-full p-8 rounded-xl bg-m3-surface-container-lowest text-m3-on-surface leading-relaxed text-base outline-none shadow-sm focus:ring-2 focus:ring-m3-secondary/20 transition-all resize-none font-body border border-m3-outline-variant/10 placeholder:text-m3-on-surface-variant/40"
          placeholder={
            "Write lesson notes in Markdown…\n\nYou can use **bold**, *italic*, lists, code blocks, and more."
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>
    </>
  );
}
