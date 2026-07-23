import { useState, useRef, useCallback } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileText,
  Video,
  FileCode,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  Brain,
  X,
  History,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  useTeacherLessonMaterials,
  useTeacherProcessingSummary,
  useTeacherLessonKnowledgeGraph,
  useTeacherMaterialStatus,
  useInitMaterialUpload,
  useCompleteMaterialUpload,
  useFetchMultipartParts,
  useCompleteMultipartUpload,
  useAbortMultipartUpload,
  useReprocessMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useMaterialVersions,
  useRollbackMaterialVersion,
} from "@/lib/api/hooks/materials";
import {
  useTeacherCourseById,
  useTeacherLesson,
  useUpdateLesson,
} from "@/lib/api/hooks/teacher-courses";
import type {
  LearningMaterial,
  LessonKnowledgeGraph,
} from "@/lib/api/types/teacher";
import type {
  MaterialUploadInit,
  MaterialUploadInitOut,
} from "@/lib/api/types";
import { uploadMultipart } from "@/lib/upload/multipart";
import { ApiError } from "@/lib/api/client";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { cn } from "@/lib/utils";

const PROC_STATUS: Record<string, { color: string; spin?: boolean }> = {
  not_queued: { color: "bg-amber-50 text-amber-600" },
  pending: { color: "bg-blue-50 text-blue-700", spin: true },
  extracting: { color: "bg-blue-100 text-blue-700", spin: true },
  chunking: { color: "bg-blue-100 text-blue-800", spin: true },
  embedding: { color: "bg-blue-100 text-blue-800", spin: true },
  building_kg: { color: "bg-fuchsia-100 text-fuchsia-700", spin: true },
  ready: { color: "bg-emerald-100 text-emerald-700" },
  failed: { color: "bg-red-100 text-red-700" },
};

const MATERIAL_TYPE_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  video: Video,
  code: FileCode,
};

const MATERIAL_TYPE_OPTIONS: ReadonlyArray<{
  value: MaterialUploadInit["material_type"];
  labelKey?: string;
  labelText?: string;
}> = [
  { value: "pdf", labelKey: "pdf" },
  { value: "video", labelText: "Video" },
  { value: "text", labelKey: "text" },
  { value: "pptx", labelText: "Slide (PPTX)" },
  { value: "docx", labelText: "Word (DOCX)" },
  { value: "code", labelKey: "code" },
  { value: "audio", labelKey: "audio" },
  { value: "image", labelKey: "image" },
  { value: "xlsx", labelText: "Excel (XLSX)" },
];

function detectMaterialType(file: File): MaterialUploadInit["material_type"] {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".pptx")) return "pptx";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".xlsx")) return "xlsx";
  if (/\.(py|js|ts|tsx|jsx|java|c|cpp|go|rs)$/.test(name)) return "code";
  if (/\.(txt|md|markdown)$/.test(name) || file.type.startsWith("text/"))
    return "text";
  return "pdf";
}

function materialIcon(type: string) {
  return MATERIAL_TYPE_ICON[type] ?? FileText;
}

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isLikelyCorsError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (
    err instanceof Error &&
    /Failed to fetch|NetworkError|CORS/i.test(err.message)
  ) {
    return true;
  }
  return false;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-m3-on-surface-variant">
        <span>{label}</span>
        <span className="tabular-nums font-semibold text-m3-on-surface">
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-m3-outline-variant/30 overflow-hidden">
        <div
          className="h-full bg-m3-secondary transition-all duration-200"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

function SelectedFileForm({
  file,
  lessonId,
  courseId,
  lessonPrimaryMaterialId,
  onDone,
  onCancel,
}: {
  file: File;
  lessonId: string;
  courseId: string;
  lessonPrimaryMaterialId: string | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const initUpload = useInitMaterialUpload(lessonId);
  const completeUpload = useCompleteMaterialUpload();
  const updateLesson = useUpdateLesson(lessonId, courseId);
  const fetchParts = useFetchMultipartParts();
  const completeMultipart = useCompleteMultipartUpload();
  const abortMultipart = useAbortMultipartUpload();

  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "init" | "hashing" | "uploading" | "completing"
  >("idle");
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const [form, setForm] = useState<{
    title: string;
    material_type: MaterialUploadInit["material_type"];
    ai_processing_enabled: boolean;
    visible_to_students: boolean;
  }>({
    title: file.name.replace(/\.[^.]+$/, ""),
    material_type: detectMaterialType(file),
    ai_processing_enabled: true,
    visible_to_students: true,
  });

  async function runSingleUpload(
    init: MaterialUploadInitOut,
    contentType: string,
  ) {
    if (!init.upload_url) {
      throw new Error(t("teacher_lesson_materials.errors.upload_url_missing"));
    }
    setPhase("hashing");
    const checksum = await sha256Hex(file);
    setPhase("uploading");
    setProgress(0);
    try {
      const res = await fetch(init.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!res.ok) {
        throw new Error(`S3 PUT failed: ${res.status}`);
      }
    } catch (err) {
      if (isLikelyCorsError(err)) {
        toast.error(t("teacher_lesson_materials.toasts.storage_not_ready"));
      }
      throw err;
    }
    setProgress(100);
    setPhase("completing");
    await completeUpload.mutateAsync({
      materialId: init.material_id,
      versionId: init.version_id,
      payload: {
        storage_object_id: init.storage_object_id,
        checksum_sha256: checksum,
      },
    });
  }

  async function runMultipartUpload(init: MaterialUploadInitOut) {
    setPhase("uploading");
    setProgress(0);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const result = await uploadMultipart(file, init, {
        signal: ac.signal,
        onProgress: ({ bytesUploaded, totalBytes }) => {
          setProgress(
            totalBytes === 0 ? 0 : (bytesUploaded / totalBytes) * 100,
          );
        },
        fetchParts: async (uploadId, from, count) => {
          const res = await fetchParts.mutateAsync({
            materialId: init.material_id,
            versionId: init.version_id,
            uploadId,
            from,
            count,
          });
          return res;
        },
      });
      setPhase("completing");
      await completeMultipart.mutateAsync({
        materialId: init.material_id,
        versionId: init.version_id,
        payload: {
          upload_id: result.uploadId,
          parts: result.parts,
        },
      });
    } catch (err) {
      if (init.upload_id) {
        try {
          await abortMultipart.mutateAsync({
            materialId: init.material_id,
            versionId: init.version_id,
            payload: { upload_id: init.upload_id },
          });
        } catch {
          /* swallow abort errors — primary error is more important */
        }
      }
      if (isLikelyCorsError(err)) {
        toast.error(t("teacher_lesson_materials.toasts.storage_not_ready"));
      }
      throw err;
    } finally {
      abortRef.current = null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setUploading(true);
    setPhase("init");
    setProgress(0);

    const contentType = file.type || "application/octet-stream";
    try {
      const init = await initUpload.mutateAsync({
        filename: file.name,
        content_type: contentType,
        size_bytes: file.size,
        title: form.title.trim(),
        material_type: form.material_type,
      });

      if (init.mode === "single") {
        await runSingleUpload(init, contentType);
      } else {
        await runMultipartUpload(init);
      }

      // Wire this material as the lesson's primary so the student reading
      // pane has something to render. Without this, an AI-Hub upload lands
      // fine but leaves lessons.primary_material_id NULL, so the learner
      // page shows nothing (or a download-only fallback). Only claim the
      // slot when it's empty — don't stomp an existing primary the teacher
      // already chose. Best-effort: a failure here shouldn't fail the
      // upload the teacher just completed successfully.
      if (!lessonPrimaryMaterialId) {
        try {
          await updateLesson.mutateAsync({
            primary_material_id: init.material_id,
          });
        } catch {
          /* non-fatal — material uploaded; primary link can be set later */
        }
      }

      toast.success(t("teacher_lesson_materials.toasts.upload_complete"));
      onDone();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("teacher_lesson_materials.toasts.upload_failed");
      toast.error(msg);
    } finally {
      setUploading(false);
      setPhase("idle");
      setProgress(0);
    }
  }

  function handleCancelUpload() {
    abortRef.current?.abort();
  }

  const phaseLabel =
    phase === "init"
      ? t("teacher_lesson_materials.phase.init")
      : phase === "hashing"
        ? t("teacher_lesson_materials.phase.hashing")
        : phase === "uploading"
          ? t("teacher_lesson_materials.phase.uploading")
          : phase === "completing"
            ? t("teacher_lesson_materials.phase.completing")
            : "";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-6 bg-m3-surface-container-low rounded-xl border border-m3-outline-variant/20"
    >
      <div className="flex items-center gap-3 p-3 bg-m3-surface-container rounded-xl">
        <div className="w-9 h-9 rounded-xl bg-m3-primary-fixed flex items-center justify-center shrink-0">
          {form.material_type === "video" ? (
            <Video className="h-4 w-4 text-m3-primary" />
          ) : form.material_type === "code" ? (
            <FileCode className="h-4 w-4 text-m3-primary" />
          ) : (
            <FileText className="h-4 w-4 text-m3-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-m3-on-surface truncate">
            {file.name}
          </p>
          <p className="text-xs text-m3-on-surface-variant">
            {formatBytes(file.size)}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_lesson_materials.form.title_label")}
        </label>
        <input
          required
          disabled={uploading}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30 disabled:opacity-60"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_lesson_materials.form.doc_type_label")}
        </label>
        <select
          disabled={uploading}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30 disabled:opacity-60"
          value={form.material_type ?? "pdf"}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              material_type: e.target
                .value as MaterialUploadInit["material_type"],
            }))
          }
        >
          {MATERIAL_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value ?? "pdf"} value={opt.value ?? "pdf"}>
              {opt.labelKey
                ? t(`teacher_lesson_materials.doc_type.${opt.labelKey}`)
                : opt.labelText}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-xs text-m3-on-surface cursor-pointer">
          <input
            type="checkbox"
            disabled={uploading}
            checked={form.ai_processing_enabled}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                ai_processing_enabled: e.target.checked,
              }))
            }
            className="rounded"
          />
          <Sparkles className="h-3.5 w-3.5 text-m3-secondary" />
          {t("teacher_lesson_materials.form.ai_processing")}
        </label>
        <label className="flex items-center gap-2 text-xs text-m3-on-surface cursor-pointer">
          <input
            type="checkbox"
            disabled={uploading}
            checked={form.visible_to_students}
            onChange={(e) =>
              setForm((f) => ({ ...f, visible_to_students: e.target.checked }))
            }
            className="rounded"
          />
          <Eye className="h-3.5 w-3.5" />
          {t("teacher_lesson_materials.form.visible_to_students")}
        </label>
      </div>

      {uploading && phase !== "idle" && (
        <div className="space-y-2">
          <ProgressBar value={progress} label={phaseLabel} />
          {phase === "uploading" && file.size > 100 * 1024 * 1024 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelUpload}
              className="gap-1.5 text-xs text-m3-error hover:text-m3-error hover:bg-m3-error-container/30"
            >
              <X className="h-3 w-3" />
              {t("teacher_lesson_materials.form.cancel_upload")}
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          disabled={uploading}
          className="flex-1 gap-2 gradient-primary text-white border-0 shadow-ai-glow"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />{" "}
              {t("teacher_lesson_materials.form.uploading")}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />{" "}
              {t("teacher_lesson_materials.form.upload_button")}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={uploading}
          className="px-4"
        >
          {t("common.close")}
        </Button>
      </div>
    </form>
  );
}

function ProcessingStatusCard({ material }: { material: LearningMaterial }) {
  const { t } = useTranslation();
  const { data: status } = useTeacherMaterialStatus(material.id);
  const proc =
    PROC_STATUS[status?.processing_status ?? "pending"] ?? PROC_STATUS.pending;
  const procKey = status?.processing_status ?? "pending";
  const Icon = materialIcon(material.material_type);

  const rawStatus = status?.processing_status ?? "pending";
  // Live percent published by the worker per stage (Redis-backed, real-time).
  // Falls back to a per-stage floor when the number isn't present yet so the
  // bar never reads 0% once a stage is underway.
  const STAGE_FLOOR: Record<string, number> = {
    pending: 5,
    extracting: 10,
    chunking: 30,
    embedding: 60,
    enriching: 80,
    building_kg: 95,
    ready: 100,
  };
  const livePercent = status?.progress_percent ?? 0;
  const floor = STAGE_FLOOR[rawStatus] ?? 0;
  const percent = Math.max(livePercent, floor);
  const inFlight = [
    "pending",
    "extracting",
    "chunking",
    "embedding",
    "enriching",
    "building_kg",
  ].includes(rawStatus);
  // Live sub-progress the worker publishes for looping stages, surfaced by
  // the endpoint on latest_log_line as "kg_build · 42/85". Pull out the
  // "N/M" count so the KG line can show a running tally instead of a
  // frozen 95%.
  const kgDetail = /(\d+\/\d+)/.exec(status?.latest_log_line ?? "")?.[1] ?? "";

  return (
    <div className="p-6 bg-m3-surface-container-low rounded-xl border border-m3-secondary/10 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-m3-secondary-fixed flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-m3-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-m3-on-surface truncate">
            {material.title}
          </p>
          <Badge className={cn("text-[10px] border-0 mt-0.5", proc.color)}>
            {proc.spin && (
              <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin inline-block" />
            )}
            {t(`teacher_lesson_materials.proc_status.${procKey}`)}
          </Badge>
        </div>
        {inFlight && (
          <span className="text-sm font-bold text-m3-secondary tabular-nums shrink-0">
            {percent}%
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="h-1.5 rounded-full bg-m3-outline-variant/30 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full bg-m3-secondary transition-all duration-500 ease-out",
              inFlight && "ai-pulse",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-[11px] text-m3-on-surface-variant">
          {rawStatus === "building_kg"
            ? `${t("teacher_lesson_materials.processing.building_kg")}${kgDetail ? ` (${kgDetail})` : ""}`
            : rawStatus === "enriching"
              ? t("teacher_lesson_materials.processing.enriching")
              : rawStatus === "embedding"
                ? t("teacher_lesson_materials.processing.embedding")
                : rawStatus === "chunking"
                  ? t("teacher_lesson_materials.processing.chunking")
                  : rawStatus === "extracting"
                    ? t("teacher_lesson_materials.processing.extracting")
                    : t("teacher_lesson_materials.processing.queued")}
        </p>
      </div>
    </div>
  );
}

function MaterialCard({
  material,
  onDelete,
}: {
  material: LearningMaterial;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { data: status } = useTeacherMaterialStatus(material.id);
  const reprocess = useReprocessMaterial(material.id);
  const updateMaterial = useUpdateMaterial(material.id);
  const [showVersions, setShowVersions] = useState(false);

  const notQueued = !material.ai_processing_enabled && !status?.active_job_id;
  const procKey = notQueued
    ? "not_queued"
    : (status?.processing_status ?? "pending");
  const proc = PROC_STATUS[procKey] ?? PROC_STATUS.pending;
  const Icon = materialIcon(material.material_type);

  function handleReprocess() {
    reprocess.mutate(undefined, {
      onSuccess: () =>
        toast.success(t("teacher_lesson_materials.toasts.reprocess_started")),
      onError: (err) => {
        if (
          err instanceof ApiError &&
          err.status === 409 &&
          err.code === "concurrent_reprocess"
        ) {
          toast.error(t("teacher_lesson_materials.toasts.reprocess_busy"));
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          toast.error(t("teacher_lesson_materials.toasts.reprocess_forbidden"));
          return;
        }
        toast.error(
          (err as Error).message ||
            t("teacher_lesson_materials.toasts.reprocess_failed"),
        );
      },
    });
  }

  function handleEnableAI() {
    updateMaterial.mutate(
      { ai_processing_enabled: true },
      {
        onSuccess: () =>
          reprocess.mutate(undefined, {
            onSuccess: () =>
              toast.success(t("teacher_lesson_materials.toasts.ai_enabled")),
            onError: (err) => {
              if (
                err instanceof ApiError &&
                err.status === 409 &&
                err.code === "concurrent_reprocess"
              ) {
                toast.error(
                  t("teacher_lesson_materials.toasts.reprocess_busy"),
                );
                return;
              }
              toast.error((err as Error).message);
            },
          }),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 403) {
            toast.error(t("teacher_lesson_materials.toasts.edit_forbidden"));
            return;
          }
          toast.error((err as Error).message);
        },
      },
    );
  }

  function handleToggleVisibility() {
    updateMaterial.mutate(
      { visible_to_students: !material.visible_to_students },
      {
        onSuccess: () =>
          toast.success(
            material.visible_to_students
              ? t("teacher_lesson_materials.toasts.hidden_from_students")
              : t("teacher_lesson_materials.toasts.shown_to_students"),
          ),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 403) {
            toast.error(t("teacher_lesson_materials.toasts.edit_forbidden"));
            return;
          }
          toast.error((err as Error).message);
        },
      },
    );
  }

  const enablingAI = updateMaterial.isPending || reprocess.isPending;

  return (
    <div className="bg-card rounded-xl border border-m3-outline-variant/20 hover:border-m3-outline-variant/40 transition-colors">
      <div className="flex items-center gap-4 p-4 group">
        <div className="h-10 w-10 rounded-xl bg-m3-surface-container flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-m3-on-surface-variant" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-m3-on-surface truncate">
            {material.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge className={cn("text-[10px] border-0", proc.color)}>
              {proc.spin && (
                <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin inline-block" />
              )}
              {t(`teacher_lesson_materials.proc_status.${procKey}`)}
            </Badge>
            <span className="text-[11px] text-m3-on-surface-variant capitalize">
              {material.material_type}
            </span>
            {material.ai_processing_enabled && (
              <Badge className="text-[10px] border-0 bg-m3-secondary-fixed text-m3-on-secondary-fixed gap-1">
                <Sparkles className="h-2.5 w-2.5" /> AI
              </Badge>
            )}
            {material.visible_to_students ? (
              <Badge className="text-[10px] border-0 bg-emerald-50 text-emerald-700 gap-1">
                <Eye className="h-2.5 w-2.5" />{" "}
                {t("teacher_lesson_materials.badge.visible")}
              </Badge>
            ) : (
              <Badge className="text-[10px] border-0 bg-slate-100 text-slate-500 gap-1">
                <EyeOff className="h-2.5 w-2.5" />{" "}
                {t("teacher_lesson_materials.badge.hidden")}
              </Badge>
            )}
          </div>
          {status?.processing_error && (
            <p className="text-[11px] text-red-600 mt-1 truncate">
              {status.processing_error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={
              material.visible_to_students
                ? t("teacher_lesson_materials.actions.toggle_visibility_hide")
                : t("teacher_lesson_materials.actions.toggle_visibility_show")
            }
            disabled={updateMaterial.isPending}
            onClick={handleToggleVisibility}
          >
            {material.visible_to_students ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </Button>
          {notQueued && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-m3-secondary hover:text-m3-secondary hover:bg-m3-secondary-fixed/30"
              title={t("teacher_lesson_materials.actions.enable_ai")}
              disabled={enablingAI}
              onClick={handleEnableAI}
            >
              {enablingAI ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {!notQueued &&
            (status?.processing_status === "failed" ||
              status?.processing_status === "ready") && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={t("teacher_lesson_materials.actions.reprocess")}
                disabled={reprocess.isPending}
                onClick={handleReprocess}
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    reprocess.isPending && "animate-spin",
                  )}
                />
              </Button>
            )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", showVersions && "bg-m3-surface-container")}
            title={t("teacher_lesson_materials.versions.toggle")}
            onClick={() => setShowVersions((v) => !v)}
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-m3-error hover:text-m3-error hover:bg-m3-error-container/30"
            title={t("common.delete")}
            onClick={() => onDelete(material.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {showVersions && <MaterialVersionsPanel materialId={material.id} />}
    </div>
  );
}

function MaterialVersionsPanel({ materialId }: { materialId: string }) {
  const { t } = useTranslation();
  const { data: versions, isLoading } = useMaterialVersions(materialId);
  const rollback = useRollbackMaterialVersion(materialId);

  function handleRollback(versionId: string) {
    rollback.mutate(versionId, {
      onSuccess: () =>
        toast.success(t("teacher_lesson_materials.versions.rollback_success")),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.error(t("teacher_lesson_materials.versions.rollback_rejected"));
          return;
        }
        toast.error((err as Error).message);
      },
    });
  }

  return (
    <div className="border-t border-m3-outline-variant/20 px-4 py-3 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_lesson_materials.versions.title")}
      </p>
      {isLoading ? (
        <div className="h-8 bg-m3-surface-container animate-pulse rounded-lg" />
      ) : !versions?.length ? (
        <p className="text-xs text-m3-on-surface-variant">
          {t("teacher_lesson_materials.versions.empty")}
        </p>
      ) : (
        versions.map((v) => (
          <div key={v.id} className="flex items-center gap-3 text-xs py-1">
            <span className="font-mono font-medium text-m3-on-surface w-8">
              v{v.version_no}
            </span>
            <Badge
              className={cn(
                "text-[10px] border-0",
                v.processing_status === "ready"
                  ? "bg-emerald-100 text-emerald-700"
                  : v.processing_status === "failed"
                    ? "bg-m3-error-container text-m3-on-error-container"
                    : "bg-m3-surface-container text-m3-on-surface-variant",
              )}
            >
              {v.processing_status}
            </Badge>
            <span className="text-m3-on-surface-variant flex-1 truncate">
              {new Date(v.uploaded_at).toLocaleString()}
            </span>
            {v.is_current ? (
              <Badge className="text-[10px] border-0 bg-m3-primary/10 text-m3-primary">
                {t("teacher_lesson_materials.versions.current")}
              </Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                disabled={v.processing_status !== "ready" || rollback.isPending}
                title={
                  v.processing_status !== "ready"
                    ? t("teacher_lesson_materials.versions.not_ready")
                    : undefined
                }
                onClick={() => handleRollback(v.id)}
              >
                <Undo2 className="h-3 w-3" />
                {t("teacher_lesson_materials.versions.rollback")}
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function MaterialDeleteButton({
  id,
  onDeleted,
}: {
  id: string;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const del = useDeleteMaterial(id);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={del.isPending}
      onClick={() =>
        del.mutate(undefined, {
          onSuccess: () => {
            toast.success(t("teacher_lesson_materials.toasts.deleted"));
            onDeleted();
          },
          onError: (err) => {
            if (err instanceof ApiError && err.status === 403) {
              toast.error(
                t("teacher_lesson_materials.toasts.delete_forbidden"),
              );
              return;
            }
            if (
              err instanceof ApiError &&
              err.status === 409 &&
              err.code === "material_busy"
            ) {
              toast.error(t("teacher_lesson_materials.toasts.delete_busy"));
              return;
            }
            toast.error(
              (err as Error).message ||
                t("teacher_lesson_materials.toasts.delete_failed"),
            );
          },
        })
      }
    >
      {del.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        t("teacher_lesson_materials.actions.confirm_delete")
      )}
    </Button>
  );
}

// Deterministic radial layout for the KG preview: the most-central concept
// (highest weight, index 0) sits at the centre, the rest fan out on rings by
// rank. No physics sim, no new deps — stable positions that don't jitter
// between renders, and legible for the bounded top-N node set.
function layoutKgNodes(
  nodes: LessonKnowledgeGraph["nodes"],
  width: number,
  height: number,
): Map<string, { x: number; y: number; r: number }> {
  const positions = new Map<string, { x: number; y: number; r: number }>();
  const cx = width / 2;
  const cy = height / 2;
  const maxW = Math.max(...nodes.map((n) => n.weight), 1);
  const minW = Math.min(...nodes.map((n) => n.weight), 1);
  const radiusFor = (w: number) => {
    // 7–18px by relative weight.
    const t = maxW === minW ? 1 : (w - minW) / (maxW - minW);
    return 7 + t * 11;
  };

  nodes.forEach((node, i) => {
    if (i === 0) {
      positions.set(node.id, { x: cx, y: cy, r: radiusFor(node.weight) });
      return;
    }
    // Two rings: nodes 1..8 inner, rest outer. Golden-angle spacing so
    // neighbours don't stack even at high counts.
    const isInner = i <= 8;
    const ring = isInner
      ? Math.min(width, height) * 0.26
      : Math.min(width, height) * 0.42;
    const angle = i * 2.399963; // golden angle (radians)
    positions.set(node.id, {
      x: cx + ring * Math.cos(angle),
      y: cy + ring * Math.sin(angle),
      r: radiusFor(node.weight),
    });
  });
  return positions;
}

function KnowledgeGraphPreview({
  lessonId,
  readyCount,
}: {
  lessonId: string;
  readyCount: number;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useTeacherLessonKnowledgeGraph(
    lessonId,
    readyCount,
  );
  const [hovered, setHovered] = useState<string | null>(null);

  const W = 340;
  const H = 240;

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];
  const positions =
    nodes.length > 0
      ? layoutKgNodes(nodes, W, H)
      : new Map<string, { x: number; y: number; r: number }>();
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const hoveredNode = hovered ? nodeById.get(hovered) : null;
  // Direct neighbours of the hovered node (either edge direction) — kept
  // bright while the rest dim, so the hovered concept's connections read
  // clearly.
  const neighborIds = new Set<string>();
  if (hovered) {
    for (const e of edges) {
      if (e.source === hovered) neighborIds.add(e.target);
      else if (e.target === hovered) neighborIds.add(e.source);
    }
  }

  return (
    <div className="glass ghost-border shadow-glass rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-center gap-2">
        <Brain className="h-5 w-5 text-m3-secondary" />
        <h3 className="font-headline font-bold text-lg text-m3-on-surface">
          {t("teacher_lesson_materials.kg.title")}
        </h3>
      </div>

      {isLoading ? (
        <div className="h-[240px] rounded-xl bg-m3-surface-container-low animate-pulse" />
      ) : data?.enabled === false ? (
        <p className="text-xs text-m3-on-surface-variant font-medium text-center py-16">
          {t("teacher_lesson_materials.kg.disabled_hint")}
        </p>
      ) : nodes.length === 0 ? (
        <p className="text-xs text-m3-on-surface-variant font-medium text-center py-16">
          {readyCount > 0
            ? t("teacher_lesson_materials.kg.empty_hint")
            : t("teacher_lesson_materials.kg.awaiting_hint")}
        </p>
      ) : (
        <>
          <div className="relative">
            <svg
              width="100%"
              viewBox={`0 0 ${W} ${H}`}
              className="rounded-xl bg-m3-surface-container-lowest/40"
              role="img"
              aria-label={t("teacher_lesson_materials.kg.title")}
            >
              <defs>
                <marker
                  id="kg-arrow-prereq"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="4.5"
                  markerHeight="4.5"
                  orient="auto-start-reverse"
                >
                  <path d="M0,1 L9,5 L0,9 z" fill="#d97706" />
                </marker>
                <marker
                  id="kg-arrow-prereq-active"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M0,1 L9,5 L0,9 z" fill="#b45309" />
                </marker>
                <marker
                  id="kg-arrow-related"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="4"
                  markerHeight="4"
                  orient="auto-start-reverse"
                >
                  <path d="M0,1 L9,5 L0,9 z" fill="#94a3b8" />
                </marker>
                <marker
                  id="kg-arrow-related-active"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="4.5"
                  markerHeight="4.5"
                  orient="auto-start-reverse"
                >
                  <path d="M0,1 L9,5 L0,9 z" fill="#475569" />
                </marker>
              </defs>
              {/* Edges — dashed amber for prerequisites, solid grey for related.
                  Directed source → target with an arrowhead. On node hover the
                  connected edges keep their relation colour but shift to a
                  higher-contrast shade and thicken; the rest dim. */}
              {edges.map((e, i) => {
                const a = positions.get(e.source);
                const b = positions.get(e.target);
                if (!a || !b) return null;
                const isPrereq = e.relation === "PREREQUISITE_OF";
                const connected = hovered === e.source || hovered === e.target;
                const dim = hovered && !connected;
                // Shorten the segment so the arrowhead lands on the target's
                // rim, not buried under the circle.
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len;
                const uy = dy / len;
                const x2 = b.x - ux * (b.r + 2);
                const y2 = b.y - uy * (b.r + 2);
                const x1 = a.x + ux * (a.r + 2);
                const y1 = a.y + uy * (a.r + 2);
                const nx = uy; // right-hand normal (SVG y-down): (uy, -ux)
                const ny = -ux;
                const curve = Math.min(len * 0.16, 24);
                const mx = (x1 + x2) / 2 + nx * curve;
                const my = (y1 + y2) / 2 + ny * curve;
                const path = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
                // Keep the relation's colour identity on hover; just deepen it
                // for contrast (orange → darker amber, grey → slate).
                const stroke = connected
                  ? isPrereq
                    ? "#b45309"
                    : "#475569"
                  : isPrereq
                    ? "#d97706"
                    : "#94a3b8";
                const marker = connected
                  ? isPrereq
                    ? "url(#kg-arrow-prereq-active)"
                    : "url(#kg-arrow-related-active)"
                  : isPrereq
                    ? "url(#kg-arrow-prereq)"
                    : "url(#kg-arrow-related)";
                return (
                  <path
                    key={i}
                    d={path}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={
                      connected ? (isPrereq ? 1.8 : 1.6) : isPrereq ? 1.4 : 1
                    }
                    strokeDasharray={isPrereq && !connected ? "4 3" : undefined}
                    markerEnd={marker}
                    opacity={
                      dim ? 0.1 : connected ? 0.95 : isPrereq ? 0.7 : 0.4
                    }
                    className="transition-opacity"
                  />
                );
              })}
              {nodes.map((n, i) => {
                const p = positions.get(n.id);
                if (!p) return null;
                const isCenter = i === 0;
                const isHovered = hovered === n.id;
                const isNeighbor =
                  !!hovered && !isHovered && neighborIds.has(n.id);
                const dim = !!hovered && !isHovered && !isNeighbor;
                return (
                  <g
                    key={n.id}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                    className="cursor-pointer transition-opacity"
                    opacity={dim ? 0.25 : 1}
                  >
                    {/* Halo behind the hovered node so it stands out clearly. */}
                    {isHovered && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={p.r + 5}
                        fill="none"
                        stroke="#1e40af"
                        strokeWidth={2}
                        opacity={0.35}
                      />
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={p.r}
                      fill={
                        isCenter || isHovered
                          ? "#1e40af"
                          : isNeighbor
                            ? "#bfdbfe"
                            : "#dbeafe"
                      }
                      stroke={
                        isHovered ? "#1e3a8a" : isCenter ? "#1e3a8a" : "#3b82f6"
                      }
                      strokeWidth={isHovered ? 2.5 : 1.5}
                    />
                    {(isCenter || p.r > 12 || isHovered || isNeighbor) && (
                      <text
                        x={p.x}
                        y={p.y + p.r + 9}
                        textAnchor="middle"
                        fontSize={isHovered ? "9" : "8"}
                        fontWeight={isHovered ? "700" : "600"}
                        fill="currentColor"
                        className={cn(
                          "pointer-events-none",
                          isHovered
                            ? "text-m3-on-surface"
                            : "text-m3-on-surface-variant",
                        )}
                      >
                        {n.label.length > 18
                          ? `${n.label.slice(0, 17)}…`
                          : n.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            {/* Hover detail card */}
            {hoveredNode && (
              <div className="absolute top-2 left-2 max-w-[70%] rounded-lg bg-m3-surface-container-high/95 backdrop-blur px-3 py-2 shadow-lg pointer-events-none">
                <p className="text-xs font-bold text-m3-on-surface">
                  {hoveredNode.label}
                </p>
                <p className="text-[10px] text-m3-secondary font-semibold uppercase tracking-wide">
                  {hoveredNode.type}
                </p>
                {hoveredNode.definition && (
                  <p className="text-[10px] text-m3-on-surface-variant mt-0.5 line-clamp-3">
                    {hoveredNode.definition}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Legend + count */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] text-m3-on-surface-variant">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 border-t border-dashed border-amber-600" />
                {t("teacher_lesson_materials.kg.legend_prereq")}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 border-t border-m3-outline-variant" />
                {t("teacher_lesson_materials.kg.legend_related")}
              </span>
            </div>
            {data && data.total_concepts > nodes.length && (
              <span className="font-medium">
                {t("teacher_lesson_materials.kg.showing_top", {
                  shown: nodes.length,
                  total: data.total_concepts,
                })}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function LessonMaterialsPage() {
  const { t } = useTranslation();
  const params = useParams({ strict: false }) as {
    courseId: string;
    lessonId: string;
  };
  const { courseId, lessonId } = params;

  const { data: course } = useTeacherCourseById(courseId);
  const { data: lesson, isLoading: lessonLoading } = useTeacherLesson(lessonId);
  const { data: materials = [], isLoading: materialsLoading } =
    useTeacherLessonMaterials(lessonId);
  const { data: summary } = useTeacherProcessingSummary(lessonId);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const readyCount = summary?.completed_versions ?? 0;
  const processingCount = summary?.processing_versions ?? 0;

  const processingMaterial =
    processingCount > 0
      ? materials.find((m) => m.current_version_id !== null)
      : undefined;

  return (
    <div className="space-y-8 pb-16 max-w-[1400px]">
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
          { label: lesson?.title ?? t("teacher_common.lesson_fallback") },
          { label: t("teacher_lesson_materials.breadcrumb.materials") },
        ]}
      />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link to="/teacher/courses/$courseId" params={{ courseId }}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-m3-primary leading-tight">
              {t("teacher_lesson_materials.header.title")}
            </h1>
          </div>
          <p className="text-m3-on-surface-variant text-base leading-relaxed pl-11">
            {lessonLoading
              ? t("teacher_lesson_materials.header.subtitle_loading")
              : lesson?.title}{" "}
            {t("teacher_lesson_materials.header.subtitle_suffix")}
          </p>
        </div>

        {summary && (processingCount > 0 || readyCount > 0) && (
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
            {(summary.failed_versions ?? 0) > 0 && (
              <Badge className="bg-red-100 text-red-700 border-0 gap-1.5 text-xs">
                <AlertCircle className="h-3 w-3" />
                {t("teacher_lesson_materials.header.failed_count", {
                  count: summary.failed_versions,
                })}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 items-start">
        <div className="space-y-5">
          {selectedFile ? (
            <SelectedFileForm
              file={selectedFile}
              lessonId={lessonId}
              courseId={courseId}
              lessonPrimaryMaterialId={lesson?.primary_material_id ?? null}
              onDone={() => setSelectedFile(null)}
              onCancel={() => setSelectedFile(null)}
            />
          ) : (
            <FileDropzone
              onFile={setSelectedFile}
              accept=".pdf,.mp4,.mov,.txt,.md,.pptx,.docx,.xlsx,.py,.js,.ts,.jsx,.tsx,.java,.c,.cpp,.png,.jpg,.jpeg,.mp3,.wav"
              idleTitle={t("teacher_lesson_materials.dropzone.drop_idle")}
              hint={t("teacher_lesson_materials.dropzone.formats")}
            />
          )}

          {processingCount > 0 && processingMaterial ? (
            <ProcessingStatusCard material={processingMaterial} />
          ) : (
            <div className="bg-m3-surface-container-low rounded-xl p-7 text-center">
              <div className="w-12 h-12 rounded-xl bg-m3-surface-container flex items-center justify-center mx-auto mb-3">
                <Brain className="h-6 w-6 text-m3-on-surface-variant" />
              </div>
              <p className="font-headline font-bold text-m3-on-surface text-sm mb-1">
                {t("teacher_lesson_materials.processing.empty_title")}
              </p>
              <p className="text-xs text-m3-on-surface-variant">
                {t("teacher_lesson_materials.processing.empty_body")}
              </p>
            </div>
          )}

          {readyCount > 0 && (
            <div className="flex items-center gap-3 p-4 bg-m3-secondary-fixed/30 rounded-xl border border-m3-secondary/10">
              <Sparkles className="h-5 w-5 text-m3-secondary shrink-0" />
              <p className="text-sm font-medium text-m3-on-surface">
                {t("teacher_lesson_materials.processing.indexed_summary", {
                  count: readyCount,
                })}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-m3-on-surface text-lg">
              {t("teacher_lesson_materials.history.title")}
            </h2>
            {summary && (
              <span className="text-sm text-m3-on-surface-variant">
                {t("teacher_lesson_materials.history.total", {
                  count: summary.materials_total,
                })}
              </span>
            )}
          </div>

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

          <KnowledgeGraphPreview lessonId={lessonId} readyCount={readyCount} />
        </div>
      </div>
    </div>
  );
}
