import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  FileText,
  Download,
  Trash2,
  Paperclip,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Code,
  Image,
  Upload,
  Sparkles,
  BookOpen,
  Video,
  X,
  Archive,
  Loader2,
  Save,
  Pencil,
  Hash,
  AlignLeft,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useUnsavedChangesWarning } from "@/lib/use-unsaved-changes-warning";
import {
  useTeacherLesson,
  useUpdateLesson,
  useTeacherCourseById,
  useTeacherCourseContent,
  useTeacherLessonResources,
  fetchTeacherResourceDownloadUrl,
  useCreateLessonResource,
  useDeleteLessonResource,
  useDeleteLesson,
  useUpdateModuleItem,
} from "@/lib/api/hooks/teacher-courses";
import {
  useTeacherRequestUploadUrl,
  useCreateMaterial,
  useTeacherMaterialStreamUrl,
  useInitMaterialUpload,
  useCompleteMaterialUpload,
  useTeacherLessonMaterials,
  useReprocessMaterial,
  useUpdateMaterial,
  useBulkSetMaterialVisibility,
  useTeacherProcessingSummary,
} from "@/lib/api/hooks/materials";
import type { LessonResource } from "@/lib/api/types/common";
import type { LearningMaterial } from "@/lib/api/types/teacher";
import {
  ProcessingStatusCard,
  MaterialCard,
  MaterialDeleteButton,
  RecentlyDeletedSection,
  KnowledgeGraphPreview,
} from "./_components/material-hub";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { useFileDrop } from "@/lib/use-file-drop";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";

/* ── Lesson type options ── */
const LESSON_TYPE_OPTIONS = [
  { value: "video", label: "Video", icon: Video },
  { value: "reading", label: "Reading", icon: BookOpen },
] as const;

/* ── Resource file-type style map ── */
const RESOURCE_STYLES: Record<string, { bg: string; text: string }> = {
  pdf: { bg: "bg-red-50", text: "text-red-600" },
  zip: { bg: "bg-blue-50", text: "text-blue-600" },
  mp4: { bg: "bg-blue-50", text: "text-blue-700" },
  xlsx: { bg: "bg-green-50", text: "text-green-600" },
  pptx: { bg: "bg-orange-50", text: "text-orange-600" },
};

function resourceStyle(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "pdf";
  return RESOURCE_STYLES[ext] ?? RESOURCE_STYLES.pdf;
}

/* File types that carry teachable text worth feeding to the AI (quizzes,
   search, knowledge graph). Everything else — archives, video, images,
   spreadsheets — defaults AI OFF: ingesting them burns LLM spend and pollutes
   the knowledge graph with no useful extraction. Teacher can still opt in. */
const AI_DEFAULT_EXTS = new Set([
  "pdf",
  "docx",
  "doc",
  "pptx",
  "ppt",
  "txt",
  "md",
]);

function aiDefaultForFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return AI_DEFAULT_EXTS.has(ext);
}

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="p-2 rounded-lg transition-colors text-m3-on-surface-variant cursor-pointer hover:bg-m3-surface-container-high"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function makeMarkdownApplier(
  getRef: () => HTMLTextAreaElement | null,
  getNotes: () => string,
  setNotes: (v: string) => void,
) {
  function applyMarkdown(before: string, after = before) {
    const el = getRef();
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = getNotes().slice(start, end);
    const inserted = before + selected + after;
    setNotes(getNotes().slice(0, start) + inserted + getNotes().slice(end));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    }, 0);
  }

  function applyBlock(prefix: string) {
    const el = getRef();
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = getNotes().slice(start, end);
    const lines = selected
      ? selected
          .split("\n")
          .map((l) => prefix + l)
          .join("\n")
      : prefix;
    setNotes(getNotes().slice(0, start) + lines + getNotes().slice(end));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + lines.length);
    }, 0);
  }

  return { applyMarkdown, applyBlock };
}

/** AI-processing status badge shown on a resource that's also in the AI Hub.
    `status` is the correlated material's version processing_status; `undefined`
    means the resource is NOT synced to AI (no badge → rendered as "off"). */
function AiStatusBadge({ status }: { status: string | undefined }) {
  const { t } = useTranslation();
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-m3-surface-container-high text-m3-on-surface-variant">
        {t("teacher_lesson_manage.ai_badge.off")}
      </span>
    );
  }
  const ready = status === "ready";
  const failed = status === "failed" || status === "cancelled";
  const cls = ready
    ? "bg-emerald-100 text-emerald-700"
    : failed
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";
  const label = ready
    ? t("teacher_lesson_manage.ai_badge.ready")
    : failed
      ? t("teacher_lesson_manage.ai_badge.failed")
      : t("teacher_lesson_manage.ai_badge.processing");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
        cls,
      )}
    >
      {!ready && !failed && (
        <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

/* ── AI-twin actions on a resource card ──
   A downloadable resource uploaded with "Use for AI" on has a correlated AI
   Hub material (its "twin", same storage_object_id). These are the twin's
   controls surfaced right here on the resource so the teacher doesn't have to
   dig into the AI Hub:
     - Hide/Show: flips `visible_to_students` — THIS is what makes the student-
       side live preview appear. Twins default to hidden on upload, which is
       why freshly-uploaded docs show nothing on the student page.
     - Retry: reprocess a failed/cancelled ingestion so the preview can build.
   Only rendered when a twin exists, so the hooks (which need the twin id) are
   always called unconditionally. */
function ResourceAiActions({
  twin,
  onShown,
}: {
  twin: LearningMaterial;
  /** Called after a material is made visible, so the caller can claim the
      lesson's primary-material slot (required for the student preview). */
  onShown: (materialId: string) => void;
}) {
  const { t } = useTranslation();
  const status = twin.latest_version?.processing_status;
  const reprocess = useReprocessMaterial(twin.id);
  const updateMaterial = useUpdateMaterial(twin.id);
  const visible = twin.visible_to_students;
  const failed = status === "failed" || status === "cancelled";
  const ready = status === "ready";

  function toggleVisible() {
    const showing = !visible;
    updateMaterial.mutate(
      { visible_to_students: showing },
      {
        onSuccess: () => {
          // Showing a doc is only half the job — the student pane renders the
          // lesson's primary_material_id, so claim that slot too when showing.
          if (showing) onShown(twin.id);
          toast.success(
            showing
              ? t("teacher_lesson_manage.resource_ai.now_visible")
              : t("teacher_lesson_manage.resource_ai.now_hidden"),
          );
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  function handleRetry() {
    reprocess.mutate(undefined, {
      onSuccess: () =>
        toast.success(t("teacher_lesson_manage.resource_ai.retry_started")),
      onError: (err) => toast.error((err as Error).message),
    });
  }

  return (
    <>
      {failed && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={reprocess.isPending}
          title={t("teacher_lesson_manage.resource_ai.retry")}
          className="p-2 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-40"
        >
          <RefreshCw
            className={cn("h-4 w-4", reprocess.isPending && "animate-spin")}
          />
        </button>
      )}
      <button
        type="button"
        onClick={toggleVisible}
        // Only a ready doc can actually preview for students; guard the toggle
        // so hiding/showing a still-processing doc can't mislead.
        disabled={updateMaterial.isPending || (!ready && !visible)}
        title={
          !ready && !visible
            ? t("teacher_lesson_manage.resource_ai.not_ready")
            : visible
              ? t("teacher_lesson_manage.resource_ai.hide")
              : t("teacher_lesson_manage.resource_ai.show")
        }
        className={cn(
          "p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40",
          visible
            ? "text-emerald-600 hover:bg-emerald-100"
            : "text-m3-on-surface-variant hover:bg-m3-surface-container-highest",
        )}
      >
        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </>
  );
}

function ResourceCard({
  resource,
  onDelete,
  twin,
  onShown,
}: {
  resource: LessonResource;
  onDelete: (id: string) => void;
  /** Correlated AI Hub material (same storage_object_id), or undefined. */
  twin: LearningMaterial | undefined;
  /** Claim the lesson's primary-material slot after a doc is made visible. */
  onShown: (materialId: string) => void;
}) {
  const { t } = useTranslation();
  const style = resourceStyle(resource.title);
  const [downloading, setDownloading] = useState(false);
  const aiStatus = twin?.latest_version?.processing_status;

  async function handleDownload() {
    if (!resource.storage_object_id || downloading) return;
    setDownloading(true);
    try {
      const url = await fetchTeacherResourceDownloadUrl(resource.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t("teacher_lesson_manage.toasts.download_failed"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-m3-surface-container-low rounded-xl group hover:bg-m3-surface-container-high transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            style.bg,
            style.text,
          )}
        >
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-m3-on-surface text-sm truncate">
            {resource.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-m3-on-surface-variant capitalize">
              {resource.resource_type}
            </p>
            <AiStatusBadge status={aiStatus} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
        {twin && <ResourceAiActions twin={twin} onShown={onShown} />}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || !resource.storage_object_id}
          title={resource.storage_object_id ? "Download" : "No file attached"}
          className="p-2 rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-highest transition-colors cursor-pointer disabled:opacity-40"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onDelete(resource.id)}
          className="p-2 rounded-lg text-m3-error hover:bg-m3-error-container/30 transition-colors cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Video type content ── */
function VideoContent({
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

/* ── Reading type content ── */
function ReadingContent({
  notes,
  setNotes,
  notesRef,
}: {
  notes: string;
  setNotes: (v: string) => void;
  notesRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { t } = useTranslation();
  const { applyMarkdown, applyBlock } = makeMarkdownApplier(
    () => notesRef.current,
    () => notes,
    setNotes,
  );
  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline font-bold text-2xl text-m3-primary">
            {t("teacher_lesson_manage.sections.reading_content")}
          </h2>
          <p className="text-sm text-m3-on-surface-variant mt-0.5">
            {wordCount > 0
              ? t("teacher_lesson_manage.sections.read_stats", {
                  words: wordCount,
                  minutes: readTime,
                })
              : t("teacher_lesson_manage.sections.reading_content_hint")}
          </p>
        </div>
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
          <ToolbarBtn
            icon={List}
            label="Bullet List"
            onClick={() => applyBlock("- ")}
          />
          <ToolbarBtn
            icon={Hash}
            label="Heading"
            onClick={() => applyBlock("# ")}
          />
          <span className="w-px h-4 bg-m3-outline-variant/30 mx-0.5" />
          <ToolbarBtn
            icon={LinkIcon}
            label="Insert Link"
            onClick={() => applyMarkdown("[", "](url)")}
          />
          <ToolbarBtn
            icon={Image}
            label="Insert Image"
            onClick={() => applyMarkdown("![alt](", ")")}
          />
          <ToolbarBtn
            icon={Code}
            label="Code Block"
            onClick={() => applyMarkdown("```\n", "\n```")}
          />
        </div>
      </div>
      <div className="rounded-xl border border-m3-outline-variant/20 overflow-hidden shadow-sm">
        <div className="bg-m3-primary/5 border-b border-m3-outline-variant/10 px-4 py-2 flex items-center gap-2">
          <AlignLeft className="h-3.5 w-3.5 text-m3-secondary" />
          <span className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-widest">
            {t("teacher_lesson_manage.editor.label")}
          </span>
          <span className="ml-auto text-xs text-m3-on-surface-variant/50">
            {t("teacher_lesson_manage.editor.hint")}
          </span>
        </div>
        {/* Default to a compact height so the editor doesn't dominate the
            page; teacher drags the bottom-right corner (native resize-y) to
            grow it as needed. */}
        <textarea
          ref={notesRef}
          className="min-h-[240px] w-full p-8 bg-m3-surface-container-lowest text-m3-on-surface leading-relaxed text-base outline-none resize-y font-body placeholder:text-m3-on-surface-variant/40"
          placeholder={
            "# Introduction\n\nWrite your reading material here.\n\n## Key Concepts\n\n- Concept 1\n- Concept 2\n\n**Bold text**, *italic text*, `inline code`"
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   Material history — folded in from the former AI Material Hub page.
   Upload → live processing status → processed-material list (with the
   two-click delete-confirm pattern) → recently-deleted restore. Shared with
   both reading and video lessons (same component). Uses the extracted
   components from _components/material-hub.tsx verbatim.
   ════════════════════════════════════════ */
function MaterialHistorySection({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const { data: materials = [], isLoading: materialsLoading } =
    useTeacherLessonMaterials(lessonId);
  const { data: summary } = useTeacherProcessingSummary(lessonId);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const readyCount = summary?.completed_versions ?? 0;
  const processingCount = summary?.processing_versions ?? 0;
  const processingMaterial =
    processingCount > 0
      ? materials.find((m) => m.current_version_id !== null)
      : undefined;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-headline font-bold text-2xl text-m3-primary">
          {t("teacher_lesson_manage.sections.material_history")}
        </h2>
        <div className="flex gap-2 flex-wrap shrink-0">
          {processingCount > 0 && (
            <Badge className="bg-blue-100 text-blue-700 border-0 gap-1.5 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("teacher_lesson_materials.header.processing_count", {
                count: processingCount,
              })}
            </Badge>
          )}
          {readyCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1.5 text-xs">
              <CheckCircle className="h-3 w-3" />
              {t("teacher_lesson_materials.header.ready_count", {
                count: readyCount,
              })}
            </Badge>
          )}
        </div>
      </div>

      {/* Upload removed here — files are attached once via "Downloadable
          Resources" below (its "Use for AI" toggle routes a file into AI
          processing, after which it appears in this history with the live
          progress card). This section is now history/management only, so the
          teacher never sees two competing upload fields. */}

      {/* Live processing status (the "AI progress" pattern the user liked). */}
      {processingCount > 0 && processingMaterial && (
        <ProcessingStatusCard material={processingMaterial} />
      )}

      {/* Processed-material list with the two-click delete confirm. */}
      {materialsLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 bg-m3-surface-container animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-10 text-m3-on-surface-variant bg-m3-surface-container-low/50 rounded-xl">
          <FileText className="h-9 w-9 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">
            {t("teacher_lesson_materials.history.empty_title")}
          </p>
          <p className="text-xs mt-1 text-m3-on-surface-variant/70">
            {t("teacher_lesson_materials.history.empty_body")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((material) => (
            <div key={material.id}>
              <MaterialCard
                material={material}
                onDelete={(id) => setPendingDeleteId(id)}
              />
              {pendingDeleteId === material.id && (
                <div className="mt-2 flex items-center justify-end gap-2 px-4 py-3 rounded-xl bg-m3-error-container/20 border border-m3-error/20 text-xs text-m3-on-surface">
                  <span className="text-m3-error font-medium">
                    {t("teacher_lesson_materials.confirm_delete.inline")}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDeleteId(null)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <MaterialDeleteButton
                    id={material.id}
                    onDeleted={() => setPendingDeleteId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <RecentlyDeletedSection lessonId={lessonId} />
    </section>
  );
}

/* ════════════════════════════════════════
   Main page
   ════════════════════════════════════════ */
export default function LessonManagePage() {
  const { t } = useTranslation();
  const params = useParams({ strict: false }) as {
    courseId: string;
    lessonId: string;
  };
  const { courseId, lessonId } = params;

  const { data: course } = useTeacherCourseById(courseId);
  const { data: lesson, isLoading: lessonLoading } = useTeacherLesson(lessonId);
  const { data: content } = useTeacherCourseContent(courseId);
  const { data: resources = [] } = useTeacherLessonResources(lessonId);
  const updateLesson = useUpdateLesson(lessonId, courseId);
  const requestUpload = useTeacherRequestUploadUrl();
  const createResource = useCreateLessonResource(lessonId);
  const deleteResource = useDeleteLessonResource(lessonId);

  const moduleId = lesson?.module_id ?? "";
  const courseModule = (content?.modules ?? []).find((m) => m.id === moduleId);
  const createMaterial = useCreateMaterial(courseId, moduleId, lessonId);
  const { data: aiMaterials = [] } = useTeacherLessonMaterials(lessonId);
  const bulkSetVisibility = useBulkSetMaterialVisibility(lessonId);
  const initVideoUpload = useInitMaterialUpload(lessonId);
  const completeVideoUpload = useCompleteMaterialUpload();
  const { data: videoStreamData } = useTeacherMaterialStreamUrl(
    lesson?.primary_material_id,
  );
  const deleteLesson = useDeleteLesson(courseId);
  const updateModuleItem = useUpdateModuleItem(courseId);
  const navigate = useNavigate();

  /* ── Find this lesson's module item (for unlock_rule_json / prerequisites) ── */
  const moduleItem = (content?.modules ?? [])
    .flatMap((m) => m.items)
    .find((i) => i.lesson_id === lessonId);

  /* ── Editable fields ── */
  const initialized = useRef(false);
  const [title, setTitle] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);
  const [summary, setSummary] = useState("");
  const [lessonType, setLessonType] = useState("video");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [notes, setNotes] = useState("");

  const notesRef = useRef<HTMLTextAreaElement>(null);

  /* ── Local-only state ── */
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [attachingResource, setAttachingResource] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  // Whether a newly-uploaded resource is also sent to the AI Hub (quizzes,
  // search, KG). Smart-defaulted per file type on drop (see aiDefaultForFile);
  // teacher can override before the next upload.
  const [aiEnabled, setAiEnabled] = useState(true);

  /* ── All lessons in the course (for prerequisite picker) ──
     The teacher content payload carries each item's data under `item.target`
     (NOT `item.lesson`, which is only populated on the public/learner payload).
     Reading `item.lesson` here left the picker permanently empty — the actual
     bug behind "prerequisites not working". Build from `target` instead. */
  const allLessons: { id: string; title: string; lesson_type: string }[] = (
    content?.modules ?? []
  ).flatMap((m) =>
    m.items
      .filter(
        (i) =>
          i.item_type === "lesson" &&
          i.target != null &&
          i.target.id !== lessonId,
      )
      .map((i) => ({
        id: i.target!.id,
        title: i.target!.title,
        lesson_type: i.target!.lesson_type ?? "video",
      })),
  );

  /* ── Sync server data once ── */
  useEffect(() => {
    if (lesson && !initialized.current) {
      initialized.current = true;
      setTitle(lesson.title ?? "");
      setSummary(lesson.summary ?? "");
      setLessonType(lesson.lesson_type ?? "video");
      setStatus(lesson.status === "published" ? "published" : "draft");
      setDifficulty(lesson.difficulty ?? "intermediate");
      setEstimatedMinutes(lesson.estimated_minutes?.toString() ?? "");
      setNotes(lesson.notes_markdown ?? "");
    }
  }, [lesson]);

  /* ── Load prerequisites from module item once content is available ── */
  const prereqInitialized = useRef(false);
  useEffect(() => {
    if (moduleItem && !prereqInitialized.current) {
      prereqInitialized.current = true;
      const stored = moduleItem.unlock_rule_json as
        | { prerequisites?: string[] }
        | undefined;
      setPrerequisites(stored?.prerequisites ?? []);
    }
  }, [moduleItem]);

  const isDirty =
    initialized.current &&
    !saving &&
    !!lesson &&
    (title !== (lesson.title ?? "") ||
      summary !== (lesson.summary ?? "") ||
      lessonType !== (lesson.lesson_type ?? "video") ||
      status !== (lesson.status === "published" ? "published" : "draft") ||
      difficulty !== (lesson.difficulty ?? "intermediate") ||
      estimatedMinutes !== (lesson.estimated_minutes?.toString() ?? "") ||
      notes !== (lesson.notes_markdown ?? ""));

  useUnsavedChangesWarning(isDirty);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saves: Promise<unknown>[] = [
        updateLesson.mutateAsync({
          title: title.trim() || undefined,
          summary: summary.trim() || undefined,
          lesson_type: lessonType as "video" | "reading",
          status,
          difficulty: difficulty || undefined,
          estimated_minutes: estimatedMinutes
            ? Number(estimatedMinutes)
            : undefined,
          notes_markdown: notes || undefined,
        }),
      ];
      if (moduleItem) {
        saves.push(
          updateModuleItem.mutateAsync({
            itemId: moduleItem.id,
            payload: { unlock_rule_json: { prerequisites } },
          }),
        );
      }
      await Promise.all(saves);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success(t("teacher_common.lesson_saved"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_lesson_manage.toasts.save_failed"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!archiveConfirm) {
      setArchiveConfirm(true);
      return;
    }
    try {
      await updateLesson.mutateAsync({ status: "archived" });
      toast.success(t("teacher_lesson_manage.toasts.lesson_archived"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_lesson_manage.toasts.archive_failed"),
      );
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    try {
      await deleteLesson.mutateAsync(lessonId);
      toast.success(t("teacher_lesson_manage.toasts.lesson_deleted"));
      // Redirect back to the parent module (or course) — the lesson page no
      // longer exists, so staying here would show a broken/empty view.
      if (moduleId) {
        void navigate({
          to: "/teacher/courses/$courseId/modules/$moduleId",
          params: { courseId, moduleId },
        });
      } else {
        void navigate({
          to: "/teacher/courses/$courseId",
          params: { courseId },
        });
      }
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_lesson_manage.toasts.delete_failed"),
      );
    }
  }

  async function handleVideoUpload(file: File) {
    if (uploadingVideo) return;
    setUploadingVideo(true);
    try {
      const contentType = file.type || "video/mp4";
      const init = await initVideoUpload.mutateAsync({
        filename: file.name,
        content_type: contentType,
        size_bytes: file.size,
        title: file.name.replace(/\.[^.]+$/, ""),
        material_type: "video",
      });
      if (init.mode !== "single" || !init.upload_url) {
        toast.error(t("teacher_common.video_too_large"));
        return;
      }
      const buf = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buf);
      const checksum = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const putRes = await fetch(init.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!putRes.ok) {
        throw new Error(`S3 PUT failed: ${putRes.status}`);
      }
      await completeVideoUpload.mutateAsync({
        materialId: init.material_id,
        versionId: init.version_id,
        payload: {
          storage_object_id: init.storage_object_id,
          checksum_sha256: checksum,
        },
      });
      await updateLesson.mutateAsync({ primary_material_id: init.material_id });
      toast.success(t("teacher_common.video_uploaded"));
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        toast.error(t("teacher_common.storage_unavailable"));
      } else {
        toast.error(
          (err as Error).message || t("teacher_common.upload_failed"),
        );
      }
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleResourceFile(file: File) {
    if (!file) return;
    // Effective AI decision for THIS upload: the checkbox is the master switch
    // (teacher's preference); when it's on we still apply the per-file-type
    // smart default, so a ZIP/video/image won't be force-fed to the AI even
    // with the box checked (no teachable text → wasted spend + KG noise).
    const useAi = aiEnabled && aiDefaultForFile(file);
    setAttachingResource(true);
    try {
      const { storage_object, upload_url } = await requestUpload.mutateAsync({
        original_filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });
      if (upload_url && !upload_url.startsWith("s3://")) {
        await fetch(upload_url, { method: "PUT", body: file });
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const resourceType:
        | "pdf"
        | "zip"
        | "mp4"
        | "xlsx"
        | "pptx"
        | "docx"
        | "link"
        | "other" =
        ext === "pdf"
          ? "pdf"
          : ext === "zip"
            ? "zip"
            : ext === "mp4"
              ? "mp4"
              : ext === "xlsx"
                ? "xlsx"
                : ext === "pptx"
                  ? "pptx"
                  : ext === "docx"
                    ? "docx"
                    : "other";
      await createResource.mutateAsync({
        title: file.name,
        resource_type: resourceType,
        storage_object_id: storage_object.id,
        position: resources.length + 1,
      });
      showFeedback(`"${file.name}" attached successfully.`);

      // Opt-in: only sync to the AI Material Hub (and kick off ingestion) when
      // the teacher left the "Use for AI" toggle on. Skipping it avoids wasted
      // LLM spend + KG pollution for files with no teachable text (zip/video/…).
      const currentModuleId = lesson?.module_id;
      if (useAi && currentModuleId) {
        const materialType = file.type.startsWith("video/")
          ? "video"
          : ext === "pdf"
            ? "pdf"
            : ["pptx", "ppt"].includes(ext)
              ? "slides"
              : ["py", "js", "ts", "jsx", "tsx", "java", "c", "cpp"].includes(
                    ext,
                  )
                ? "code"
                : "other";
        try {
          const material = await createMaterial.mutateAsync({
            title: file.name.replace(/\.[^.]+$/, ""),
            material_type: materialType,
            storage_object_id: storage_object.id,
            // Kick off ingestion so the document gets a viewable rendition
            // instead of sitting "pending" forever with only a raw download.
            ai_processing_enabled: true,
            visible_to_students: false,
          });
          // Wire this material as the lesson's primary if the slot is empty.
          // The student reading pane renders ONLY `lesson.primary_material_id`;
          // without this the doc is uploaded + visible but the student page
          // shows nothing (the exact "live preview not working" bug). Only
          // claim an empty slot — never stomp a primary the teacher chose.
          if (material?.id) claimPrimaryIfEmpty(material.id);
        } catch {
          toast.error(t("teacher_lesson_manage.toasts.attach_sync_failed"));
        }
      }
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_lesson_manage.toasts.attach_failed"),
      );
    } finally {
      setAttachingResource(false);
    }
  }

  function handleDeleteResource(resourceId: string) {
    // Delete ONLY the downloadable resource. Do NOT cascade into the AI Hub
    // material that may share this file's storage_object_id: that material is a
    // separate, teacher-managed entity (already processed into quizzes/search/
    // KG). Auto-deleting it here silently destroyed live, working documents —
    // the teacher removed a student download and lost their processed doc. If
    // they want the AI copy gone too, they remove it explicitly in the AI Hub.
    deleteResource.mutate(resourceId, {
      onSuccess: () => showFeedback("Resource removed."),
      onError: (err) => toast.error((err as Error).message),
    });
  }

  // Correlate a resource to its AI Hub twin (same storage_object_id), or
  // undefined when the resource was never synced to AI. Drives the per-card
  // status badge AND the inline hide/show + retry actions.
  function twinForResource(
    resource: LessonResource,
  ): LearningMaterial | undefined {
    if (resource.storage_object_id == null) return undefined;
    return aiMaterials.find(
      (m: LearningMaterial) =>
        m.latest_version?.storage_object_id === resource.storage_object_id,
    );
  }

  // Claim the lesson's primary-material slot if it's currently empty. The
  // student reading pane renders ONLY `lesson.primary_material_id`, so a doc
  // with no primary set never previews for students even when visible+ready.
  // Never stomp an existing primary the teacher already chose. Best-effort —
  // a failure here shouldn't surface as a hard error on the calling action.
  function claimPrimaryIfEmpty(materialId: string) {
    if (lesson?.primary_material_id) return;
    updateLesson.mutate({ primary_material_id: materialId });
  }

  // Ready AI twins that back a downloadable resource, de-duped by id. The
  // student live preview requires BOTH: the doc is visible_to_students AND the
  // lesson's primary_material_id points at a ready doc. So the "needs fixing"
  // set is any ready twin that is either hidden OR (the lesson has no primary
  // at all — the exact ch1/ch2 case: visible but never wired as the preview).
  const readyTwins = Array.from(
    new Map(
      resources
        .map((r) => twinForResource(r))
        .filter(
          (m): m is LearningMaterial =>
            m != null && m.latest_version?.processing_status === "ready",
        )
        .map((m) => [m.id, m] as const),
    ).values(),
  );
  const hiddenReadyTwinIds = readyTwins
    .filter((m) => !m.visible_to_students)
    .map((m) => m.id);
  // The lesson's preview is unwired when there's a ready doc but no primary
  // pointer — showing/hiding visibility alone will NEVER fix this.
  const lessonPrimaryUnwired =
    !lesson?.primary_material_id && readyTwins.length > 0;
  // Show the bulk button when anything blocks the student preview.
  const needsPreviewFix = hiddenReadyTwinIds.length > 0 || lessonPrimaryUnwired;

  function handleShowAll() {
    if (!needsPreviewFix) return;
    // Always ensure the lesson has a primary pointer (pick the first ready
    // twin) — this is what fixes an already-visible-but-unwired doc.
    claimPrimaryIfEmpty(readyTwins[0]?.id);
    if (hiddenReadyTwinIds.length === 0) {
      // Nothing hidden — the only issue was the missing primary, now claimed.
      toast.success(
        t("teacher_lesson_manage.resource_ai.show_all_done", { count: 1 }),
      );
      return;
    }
    bulkSetVisibility.mutate(
      { materialIds: hiddenReadyTwinIds, visible: true },
      {
        onSuccess: ({ succeeded, failed }) => {
          if (failed > 0) {
            toast.warning(
              t("teacher_lesson_manage.resource_ai.show_all_partial", {
                succeeded,
                failed,
              }),
            );
          } else {
            toast.success(
              t("teacher_lesson_manage.resource_ai.show_all_done", {
                count: succeeded,
              }),
            );
          }
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  function togglePrerequisite(id: string) {
    setPrerequisites((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  if (lessonLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  const typeLabel =
    LESSON_TYPE_OPTIONS.find((t) => t.value === lessonType)?.label ??
    t("teacher_common.lesson_fallback");

  return (
    <div className="max-w-[1800px] mx-auto pb-20">
      <div className="pt-4 pb-2">
        <Breadcrumbs
          items={[
            {
              label: t("teacher_common.breadcrumb_teaching"),
              to: "/teacher/courses",
            },
            {
              label: course?.title ?? t("teacher_common.breadcrumb_course"),
              to: "/teacher/courses/$courseId",
              params: { courseId },
            },
            ...(courseModule
              ? [
                  {
                    label: courseModule.title,
                    to: "/teacher/courses/$courseId/modules/$moduleId",
                    params: { courseId, moduleId },
                  },
                ]
              : []),
            {
              label:
                title || lesson?.title || t("teacher_common.lesson_fallback"),
            },
          ]}
        />
      </div>

      {/* ── Sticky action bar ──
          Sticky at top-0 z-10 (inside <main>, stays ≤ z-20 per frontend
          AGENTS.md). Holds ALL lesson-level actions so they follow the teacher
          while scrolling the (now long) page: Back · Archive · Delete ·
          Publish/Unpublish · Save. The old sidebar published/draft toggle and
          the main-column danger-zone are removed so no action is duplicated.
          Archive/Delete reuse the existing two-click confirm: the first click
          arms (button turns red + label changes), the second executes. */}
      <div className="sticky top-16 z-10 -mx-1 mb-8 flex items-center justify-between gap-3 border-b border-m3-outline-variant/15 bg-m3-surface/85 px-1 py-3 backdrop-blur-md">
        <Link
          to={
            moduleId
              ? "/teacher/courses/$courseId/modules/$moduleId"
              : "/teacher/courses/$courseId"
          }
          params={moduleId ? { courseId, moduleId } : { courseId }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2.5 gap-2 text-m3-on-surface-variant"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t("teacher_common.back_to_course")}
            </span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {/* Archive (two-click confirm) */}
          <Button
            variant={archiveConfirm ? "default" : "ghost"}
            size="sm"
            onClick={handleArchive}
            onBlur={() => setArchiveConfirm(false)}
            className={cn(
              "gap-2 cursor-pointer",
              archiveConfirm
                ? "bg-amber-500 hover:bg-amber-600 text-white border-0"
                : "text-m3-on-surface-variant hover:text-amber-600",
            )}
            title={t("teacher_lesson_manage.actions.archive_title")}
          >
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">
              {archiveConfirm
                ? t("teacher_lesson_manage.actions.archive_confirm")
                : t("teacher_lesson_manage.actions.archive")}
            </span>
          </Button>

          {/* Delete (two-click confirm) */}
          <Button
            variant={deleteConfirm ? "default" : "ghost"}
            size="sm"
            onClick={handleDelete}
            onBlur={() => setDeleteConfirm(false)}
            className={cn(
              "gap-2 cursor-pointer",
              deleteConfirm
                ? "bg-m3-error hover:opacity-90 text-white border-0"
                : "text-m3-on-surface-variant hover:text-m3-error",
            )}
            title={t("teacher_lesson_manage.actions.delete_title")}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {deleteConfirm
                ? t("teacher_lesson_manage.actions.delete_confirm")
                : t("teacher_lesson_manage.actions.delete")}
            </span>
          </Button>

          <span className="mx-0.5 h-5 w-px bg-m3-outline-variant/30" />

          {/* Publish / Unpublish — single toggle replacing the old sidebar
              published/draft control. Flips local `status`; persisted on Save. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setStatus((s) => (s === "published" ? "draft" : "published"))
            }
            className={cn(
              "gap-2 cursor-pointer border-m3-outline-variant/30",
              status === "published"
                ? "text-emerald-600 hover:text-emerald-700"
                : "text-m3-on-surface-variant",
            )}
            title={
              status === "published"
                ? t("teacher_lesson_manage.actions.unpublish_title")
                : t("teacher_lesson_manage.actions.publish_title")
            }
          >
            {status === "published" ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {status === "published"
                ? t("teacher_lesson_manage.actions.published")
                : t("teacher_lesson_manage.actions.draft")}
            </span>
          </Button>

          {/* Save */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "gap-2 transition-all cursor-pointer",
              saved
                ? "bg-green-500 hover:bg-green-600 text-white border-0"
                : "gradient-primary text-white border-0 shadow-ai-glow hover:opacity-90 active:scale-95",
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {saved
                ? t("teacher_common.saved_check")
                : t("teacher_common.save_changes")}
            </span>
          </Button>
        </div>
      </div>

      {/* ── 12-col grid ── */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* ═══════════════════════════════════
            Main editor — 8 cols
        ═══════════════════════════════════ */}
        <div className="col-span-12 lg:col-span-8 space-y-10">
          {/* ── Editable lesson header ── */}
          <section className="space-y-3">
            <span className="block text-m3-secondary font-headline font-bold text-sm tracking-widest uppercase">
              {typeLabel} Lesson
            </span>

            {/* Inline editable title */}
            {titleEditing ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTitleEditing(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape")
                    setTitleEditing(false);
                }}
                className="w-full font-headline font-extrabold text-4xl lg:text-5xl text-m3-primary tracking-tight leading-tight bg-transparent border-b-2 border-m3-primary outline-none py-1"
                placeholder="Lesson title…"
              />
            ) : (
              <div
                className="group flex items-start gap-3 cursor-text"
                onClick={() => setTitleEditing(true)}
              >
                <h1 className="font-headline font-extrabold text-4xl lg:text-5xl text-m3-primary tracking-tight leading-tight flex-1">
                  {title || (
                    <span className="text-m3-on-surface-variant/40">
                      Untitled Lesson
                    </span>
                  )}
                </h1>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTitleEditing(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant shrink-0 cursor-pointer"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Editable summary */}
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="w-full text-m3-on-surface-variant text-lg max-w-2xl leading-relaxed bg-transparent outline-none resize-none placeholder:text-m3-on-surface-variant/30 border-b border-transparent focus:border-m3-outline-variant/40 transition-colors py-1"
              placeholder="Add a brief summary of this lesson…"
            />
          </section>

          {/* ── Per-type content area ── */}
          {lessonType === "video" && (
            <VideoContent
              notes={notes}
              setNotes={setNotes}
              notesRef={notesRef}
              estimatedMinutes={estimatedMinutes}
              streamUrl={videoStreamData?.stream_url}
              onVideoUpload={handleVideoUpload}
              uploading={uploadingVideo}
            />
          )}
          {lessonType === "reading" && (
            <ReadingContent
              notes={notes}
              setNotes={setNotes}
              notesRef={notesRef}
            />
          )}

          {/* ── Downloadable Resources (all types) ── */}
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-headline font-bold text-2xl text-m3-primary">
                {t("teacher_lesson_manage.sections.downloadable_resources")}
              </h2>
              {needsPreviewFix && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  disabled={bulkSetVisibility.isPending}
                  onClick={handleShowAll}
                >
                  {bulkSetVisibility.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {t("teacher_lesson_manage.resource_ai.show_all", {
                    count: Math.max(hiddenReadyTwinIds.length, 1),
                  })}
                </Button>
              )}
            </div>

            {resources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onDelete={handleDeleteResource}
                    twin={twinForResource(resource)}
                    onShown={claimPrimaryIfEmpty}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl bg-m3-surface-container-lowest ghost-border">
                <Paperclip className="h-8 w-8 text-m3-on-surface-variant/40 mb-2" />
                <p className="text-sm text-m3-on-surface-variant">
                  No resources attached yet.
                </p>
              </div>
            )}

            <FileDropzone
              onFile={handleResourceFile}
              busy={attachingResource}
              busyLabel="Uploading…"
              idleTitle="Attach New Resource"
              hint="PDF, ZIP, MP4, XLSX, PPTX, DOCX, and more"
            />

            {/* Opt-in AI sync. Controls whether the NEXT upload is also added
                to the AI Hub (quizzes, search, knowledge graph). Smart-defaulted
                per file type on drop, but the teacher can flip it here first. */}
            <label className="flex items-start gap-2.5 px-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-m3-outline-variant accent-m3-secondary cursor-pointer"
              />
              <span className="text-sm text-m3-on-surface-variant">
                <span className="font-semibold text-m3-on-surface">
                  {t("teacher_lesson_manage.ai_optin.label")}
                </span>{" "}
                {t("teacher_lesson_manage.ai_optin.hint")}
              </span>
            </label>
          </section>

          {/* ── Material history (folded in from the former AI Material Hub) ──
              Live processing progress + processed-material list +
              recently-deleted. Upload happens once via Downloadable Resources
              above. Same component for reading and video lessons. */}
          <MaterialHistorySection lessonId={lessonId} />

          {/* ── Knowledge Graph (brought over from the AI hub) ── */}
          <section className="space-y-5">
            <h2 className="font-headline font-bold text-2xl text-m3-primary">
              {t("teacher_lesson_manage.sections.knowledge_graph")}
            </h2>
            <KnowledgeGraphPreview
              lessonId={lessonId}
              readyCount={
                aiMaterials.filter((m) => m.current_version_id).length
              }
            />
          </section>
        </div>

        {/* ═══════════════════════════════════
            Sidebar — 4 cols, sticky
        ═══════════════════════════════════ */}
        <aside className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-32 self-start">
          {/* ── Lesson Settings ── */}
          <div className="bg-m3-surface-container-low rounded-xl p-6 space-y-6 shadow-sm">
            <div>
              <h3 className="font-headline font-bold text-xl text-m3-primary">
                {t("teacher_lesson_manage.settings.title")}
              </h3>
              <p className="text-xs text-m3-on-surface-variant mt-0.5">
                {t("teacher_lesson_manage.settings.subtitle")}
              </p>
            </div>

            {/* Visibility (published/draft) moved to the sticky action bar as
                the Publish/Unpublish toggle. Lesson Type selector removed —
                type is fixed at lesson creation (reading/video). */}

            {/* Estimated duration */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                {t("teacher_lesson_manage.settings.duration_label")}
              </label>
              <input
                type="number"
                min={0}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                className="w-full bg-surface-elev border border-m3-outline-variant/20 rounded-xl px-4 py-3 text-sm font-medium text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/20 transition-all"
                placeholder={t(
                  "teacher_lesson_manage.settings.duration_placeholder",
                )}
              />
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                {t("teacher_lesson_manage.settings.difficulty_label")}
              </label>
              <Select
                aria-label={t("teacher_lesson_manage.settings.difficulty_label")}
                value={difficulty}
                onValueChange={setDifficulty}
                options={[
                  {
                    value: "beginner",
                    label: t("teacher_lesson_manage.settings.difficulty_beginner"),
                  },
                  {
                    value: "intermediate",
                    label: t(
                      "teacher_lesson_manage.settings.difficulty_intermediate",
                    ),
                  },
                  {
                    value: "advanced",
                    label: t("teacher_lesson_manage.settings.difficulty_advanced"),
                  },
                ]}
                className="bg-surface-elev font-medium"
              />
            </div>
          </div>

          {/* ── Prerequisites ── */}
          <div className="bg-m3-surface-container-low rounded-xl p-6 space-y-6 shadow-sm">
            <div>
              <h3 className="font-headline font-bold text-xl text-m3-primary">
                {t("teacher_lesson_manage.prerequisites.title")}
              </h3>
              <p className="text-xs text-m3-on-surface-variant mt-0.5">
                {t("teacher_lesson_manage.prerequisites.subtitle")}
              </p>
            </div>

            {/* Selected */}
            {prerequisites.length === 0 && (
              <p className="text-sm text-m3-on-surface-variant/60 text-center py-2">
                {t("teacher_lesson_manage.prerequisites.empty")}
              </p>
            )}
            {prerequisites.map((id) => {
              const l = allLessons.find((x) => x.id === id);
              if (!l) return null;
              const TypeIcon =
                LESSON_TYPE_OPTIONS.find((t) => t.value === l.lesson_type)
                  ?.icon ?? BookOpen;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2 bg-m3-primary-fixed text-m3-primary px-3 py-2.5 rounded-xl text-sm font-medium"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{l.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePrerequisite(id)}
                    className="shrink-0 p-0.5 rounded-md hover:bg-m3-primary/10 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Lesson selector — pick a lesson to add as a prerequisite.
                Already-selected lessons are filtered out of the options so the
                dropdown only offers additions. Resets to the placeholder after
                each pick (it's an "add" action, not a bound value). */}
            {(() => {
              const available = allLessons.filter(
                (l) => !prerequisites.includes(l.id),
              );
              return (
                <Select
                  aria-label="Add a prerequisite lesson"
                  // Action picker, not a value holder: it always shows the
                  // prompt, and choosing an entry performs the add then resets.
                  // Keeping value="" preserves that behaviour.
                  value=""
                  disabled={available.length === 0}
                  onValueChange={(next) => {
                    if (next) togglePrerequisite(next);
                  }}
                  options={[
                    {
                      value: "",
                      label:
                        allLessons.length === 0
                          ? "No other lessons in this course"
                          : available.length === 0
                            ? "All lessons added"
                            : "Add a prerequisite lesson…",
                    },
                    ...available.map((l) => ({ value: l.id, label: l.title })),
                  ]}
                  className="bg-surface-elev font-medium"
                />
              );
            })()}
          </div>

          {/* AI Material Hub teaser + danger zone removed: material management
              now lives inline as "Material history" in the main column, and
              Archive/Delete moved to the sticky action bar at the top. */}
        </aside>
      </div>

      {/* ── Feedback toast bar ── */}
      <div
        aria-live="polite"
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl bg-m3-on-surface text-m3-surface text-sm font-bold transition-all duration-300",
          feedback
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none",
        )}
      >
        {feedback}
      </div>
    </div>
  );
}
