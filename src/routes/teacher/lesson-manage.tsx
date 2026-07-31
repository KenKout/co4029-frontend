import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Paperclip, Loader2, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import {
  useTeacherLesson,
  useUpdateLesson,
  useTeacherCourseById,
  useTeacherCourseContent,
  useTeacherLessonResources,
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
  useBulkSetMaterialVisibility,
} from "@/lib/api/hooks/materials";
import type { LessonResource } from "@/lib/api/types/common";
import type { LearningMaterial } from "@/lib/api/types/teacher";
import { KnowledgeGraphPreview } from "./_components/material-hub";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { cn } from "@/lib/utils";
import {
  LESSON_TYPE_OPTIONS,
  aiDefaultForFile,
} from "./_components/lesson-manage/constants";
import { VideoContent } from "./_components/lesson-manage/VideoContent";
import { ReadingContent } from "./_components/lesson-manage/ReadingContent";
import { ResourceCard } from "./_components/lesson-manage/ResourceCard";
import { MaterialHistorySection } from "./_components/lesson-manage/MaterialHistorySection";
import { LessonActionBar } from "./_components/lesson-manage/LessonActionBar";
import { LessonSettingsSidebar } from "./_components/lesson-manage/LessonSettingsSidebar";

/**
 * Teacher lesson editor. Owns the lesson's editable state (title/summary/type/
 * status/difficulty/duration/notes/prerequisites), the save/archive/delete
 * flows, video + resource upload, and AI-twin correlation. The heavy UI lives
 * in `_components/lesson-manage/*`; this file wires state to those views and
 * lays out the editor grid.
 */
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

  // In-app exit guard (back link) + the native reload/close warning, which the
  // guard installs internally — so this replaces the standalone
  // useUnsavedChangesWarning call rather than sitting alongside it.
  const leaveGuard = useUnsavedChangesGuard(isDirty);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2000);
  }

  function goBack() {
    void navigate(
      moduleId
        ? {
            to: "/teacher/courses/$courseId/modules/$moduleId",
            params: { courseId, moduleId },
          }
        : {
            to: "/teacher/courses/$courseId",
            params: { courseId },
          },
    );
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
      goBack();
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
    LESSON_TYPE_OPTIONS.find((o) => o.value === lessonType)?.label ??
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

      {/* Sticky action bar: Back · Archive · Delete · Publish/Unpublish · Save. */}
      <LessonActionBar
        courseId={courseId}
        moduleId={moduleId}
        isDirty={isDirty}
        onBackWhileDirty={() => leaveGuard.run(goBack)}
        archiveConfirm={archiveConfirm}
        onArchive={handleArchive}
        onArchiveBlur={() => setArchiveConfirm(false)}
        deleteConfirm={deleteConfirm}
        onDelete={handleDelete}
        onDeleteBlur={() => setDeleteConfirm(false)}
        status={status}
        onToggleStatus={() =>
          setStatus((s) => (s === "published" ? "draft" : "published"))
        }
        saving={saving}
        saved={saved}
        onSave={handleSave}
      />

      {/* ── 12-col grid ── */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Main editor — 8 cols */}
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

        {/* Sidebar — 4 cols, sticky */}
        <LessonSettingsSidebar
          estimatedMinutes={estimatedMinutes}
          onEstimatedMinutesChange={setEstimatedMinutes}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          prerequisites={prerequisites}
          allLessons={allLessons}
          onTogglePrerequisite={togglePrerequisite}
        />
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

      {/* "Are you sure you want to quit?" for the back link while dirty. */}
      {leaveGuard.dialog}
    </div>
  );
}
