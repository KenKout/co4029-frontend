import { useState, useEffect, useRef } from "react";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import type { LessonRead } from "@/lib/api/types/teacher";
import type { CourseContentItem } from "@/lib/api/types/common";
import {
  DEFAULT_LESSON_ESTIMATED_MINUTES,
  lessonFieldsDiffer,
  lessonServerSnapshot,
  type LessonFieldSnapshot,
} from "./helpers";

/**
 * All editor-local state for the lesson page: the editable fields, the
 * one-shot server sync, prerequisites loaded off the module item, the transient
 * confirm/saving/feedback flags, and the derived `isDirty` + leave guard.
 */
export function useLessonEditorState({
  lesson,
  moduleItem,
}: {
  lesson: LessonRead | undefined;
  moduleItem: CourseContentItem | undefined;
}) {
  /* ── Editable fields ── */
  const initialized = useRef(false);
  const fieldBaseline = useRef<LessonFieldSnapshot | null>(null);
  const [title, setTitle] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);
  const [summary, setSummary] = useState("");
  const [lessonType, setLessonType] = useState("video");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    String(DEFAULT_LESSON_ESTIMATED_MINUTES),
  );
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
  const [aiEnabled, setAiEnabled] = useState(true);

  /* ── Sync server data once ── */
  useEffect(() => {
    if (lesson && !initialized.current) {
      initialized.current = true;
      fieldBaseline.current = lessonServerSnapshot(lesson);
      setTitle(lesson.title ?? "");
      setSummary(lesson.summary ?? "");
      setLessonType(lesson.lesson_type ?? "video");
      setStatus(lesson.status === "published" ? "published" : "draft");
      setDifficulty(lesson.difficulty ?? "intermediate");
      setEstimatedMinutes(
        String(lesson.estimated_minutes ?? DEFAULT_LESSON_ESTIMATED_MINUTES),
      );
      setNotes(lesson.notes_markdown ?? "");
    }
  }, [lesson]);

  /* ── Load prerequisites from module item once content is available ── */
  const prereqInitialized = useRef(false);
  const prerequisiteBaseline = useRef<string[]>([]);
  useEffect(() => {
    if (moduleItem && !prereqInitialized.current) {
      prereqInitialized.current = true;
      const stored = moduleItem.unlock_rule_json as
        | { prerequisites?: string[] }
        | undefined;
      const nextPrerequisites = stored?.prerequisites ?? [];
      prerequisiteBaseline.current = [...nextPrerequisites];
      setPrerequisites(nextPrerequisites);
    }
  }, [moduleItem]);

  const draftSnapshot: LessonFieldSnapshot = {
    title,
    summary,
    lessonType,
    status,
    difficulty,
    estimatedMinutes,
    notes,
  };
  const prerequisitesDirty =
    prereqInitialized.current &&
    (prerequisiteBaseline.current.length !== prerequisites.length ||
      prerequisiteBaseline.current.some((id, index) => id !== prerequisites[index]));
  const isDirty =
    initialized.current &&
    !saving &&
    !!lesson &&
    ((fieldBaseline.current !== null &&
      lessonFieldsDiffer(draftSnapshot, fieldBaseline.current)) ||
      prerequisitesDirty);

  function markSaved(overrides?: Partial<LessonFieldSnapshot>) {
    fieldBaseline.current = { ...draftSnapshot, ...overrides };
    prerequisiteBaseline.current = [...prerequisites];
  }

  // In-app exit guard (back link) + the native reload/close warning, which the
  // guard installs internally — so this replaces the standalone
  // useUnsavedChangesWarning call rather than sitting alongside it.
  const leaveGuard = useUnsavedChangesGuard(isDirty);

  return {
    title,
    setTitle,
    titleEditing,
    setTitleEditing,
    summary,
    setSummary,
    lessonType,
    status,
    setStatus,
    difficulty,
    setDifficulty,
    estimatedMinutes,
    setEstimatedMinutes,
    notes,
    setNotes,
    notesRef,
    prerequisites,
    setPrerequisites,
    archiveConfirm,
    setArchiveConfirm,
    deleteConfirm,
    setDeleteConfirm,
    saving,
    setSaving,
    saved,
    setSaved,
    feedback,
    setFeedback,
    attachingResource,
    setAttachingResource,
    uploadingVideo,
    setUploadingVideo,
    aiEnabled,
    setAiEnabled,
    markSaved,
    isDirty,
    leaveGuard,
  };
}
