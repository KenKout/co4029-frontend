import type { LessonRead } from "@/lib/api/types/teacher";

/* ── Downloadable-resource type, keyed off the uploaded file's extension ── */

export type LessonResourceType =
  | "pdf"
  | "zip"
  | "mp4"
  | "xlsx"
  | "pptx"
  | "docx"
  | "link"
  | "other";

const RESOURCE_TYPE_BY_EXT: Record<string, LessonResourceType> = {
  pdf: "pdf",
  zip: "zip",
  mp4: "mp4",
  xlsx: "xlsx",
  pptx: "pptx",
  docx: "docx",
};

export function resourceTypeForExt(ext: string): LessonResourceType {
  return RESOURCE_TYPE_BY_EXT[ext] ?? "other";
}

/* ── AI Hub material type for a dropped file ── */

export type LessonMaterialType = "video" | "pdf" | "slides" | "code" | "other";

const SLIDE_EXTS = ["pptx", "ppt"];
const CODE_EXTS = ["py", "js", "ts", "jsx", "tsx", "java", "c", "cpp"];

export function materialTypeForFile(
  file: File,
  ext: string,
): LessonMaterialType {
  if (file.type.startsWith("video/")) return "video";
  if (ext === "pdf") return "pdf";
  if (SLIDE_EXTS.includes(ext)) return "slides";
  if (CODE_EXTS.includes(ext)) return "code";
  return "other";
}

/* ── Dirty tracking ──
   The editor holds every field as a string, so "is this dirty?" is a
   field-by-field comparison against the server row normalised the SAME way the
   initial-sync effect normalises it. Splitting normalise/compare keeps both
   halves readable (and each one branch-shallow). */

export interface LessonFieldSnapshot {
  title: string;
  summary: string;
  lessonType: string;
  status: "draft" | "published";
  difficulty: string;
  estimatedMinutes: string;
  notes: string;
}

/** Normalise a server lesson row into the editor's field shape. */
export function lessonServerSnapshot(lesson: LessonRead): LessonFieldSnapshot {
  return {
    title: lesson.title ?? "",
    summary: lesson.summary ?? "",
    lessonType: lesson.lesson_type ?? "video",
    status: lesson.status === "published" ? "published" : "draft",
    difficulty: lesson.difficulty ?? "intermediate",
    estimatedMinutes: lesson.estimated_minutes?.toString() ?? "",
    notes: lesson.notes_markdown ?? "",
  };
}

export function lessonFieldsDiffer(
  draft: LessonFieldSnapshot,
  server: LessonFieldSnapshot,
): boolean {
  return (
    draft.title !== server.title ||
    draft.summary !== server.summary ||
    draft.lessonType !== server.lessonType ||
    draft.status !== server.status ||
    draft.difficulty !== server.difficulty ||
    draft.estimatedMinutes !== server.estimatedMinutes ||
    draft.notes !== server.notes
  );
}
