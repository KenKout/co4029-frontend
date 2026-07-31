import { Video, BookOpen } from "lucide-react";

/* ── Lesson type options ── */
export const LESSON_TYPE_OPTIONS = [
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

export function resourceStyle(filename: string) {
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

export function aiDefaultForFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return AI_DEFAULT_EXTS.has(ext);
}
