/**
 * Map a file (or a bare MIME type / filename) to a lucide file-type icon +
 * an accent color token. Used by the FileDropzone to draw a recognisable
 * logo for the file being dragged/selected.
 *
 * Two entry points because of a browser constraint: during a `dragover`
 * event only the MIME `type` is exposed (filenames are withheld until
 * `drop`), so we classify by MIME first and fall back to the filename
 * extension once we have it.
 */
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Presentation,
  type LucideIcon,
} from "lucide-react";

export interface FileKind {
  Icon: LucideIcon;
  /** Tailwind text-color class for the icon. */
  colorClass: string;
  /** Short human label, e.g. "PDF", "Video". */
  label: string;
}

const _DEFAULT: FileKind = {
  Icon: File,
  colorClass: "text-m3-on-surface-variant",
  label: "File",
};

// Extension → kind. Kept in sync with the dropzone `accept` list.
const _BY_EXT: Record<string, FileKind> = {
  pdf: { Icon: FileText, colorClass: "text-red-500", label: "PDF" },
  doc: { Icon: FileText, colorClass: "text-blue-600", label: "Word" },
  docx: { Icon: FileText, colorClass: "text-blue-600", label: "Word" },
  txt: {
    Icon: FileText,
    colorClass: "text-m3-on-surface-variant",
    label: "Text",
  },
  md: {
    Icon: FileText,
    colorClass: "text-m3-on-surface-variant",
    label: "Markdown",
  },
  ppt: { Icon: Presentation, colorClass: "text-orange-500", label: "Slides" },
  pptx: { Icon: Presentation, colorClass: "text-orange-500", label: "Slides" },
  xls: {
    Icon: FileSpreadsheet,
    colorClass: "text-emerald-600",
    label: "Sheet",
  },
  xlsx: {
    Icon: FileSpreadsheet,
    colorClass: "text-emerald-600",
    label: "Sheet",
  },
  csv: { Icon: FileSpreadsheet, colorClass: "text-emerald-600", label: "CSV" },
  mp4: { Icon: FileVideo, colorClass: "text-m3-secondary", label: "Video" },
  mov: { Icon: FileVideo, colorClass: "text-m3-secondary", label: "Video" },
  webm: { Icon: FileVideo, colorClass: "text-m3-secondary", label: "Video" },
  mp3: { Icon: FileAudio, colorClass: "text-purple-500", label: "Audio" },
  wav: { Icon: FileAudio, colorClass: "text-purple-500", label: "Audio" },
  png: { Icon: FileImage, colorClass: "text-pink-500", label: "Image" },
  jpg: { Icon: FileImage, colorClass: "text-pink-500", label: "Image" },
  jpeg: { Icon: FileImage, colorClass: "text-pink-500", label: "Image" },
  gif: { Icon: FileImage, colorClass: "text-pink-500", label: "Image" },
  webp: { Icon: FileImage, colorClass: "text-pink-500", label: "Image" },
  zip: { Icon: FileArchive, colorClass: "text-amber-600", label: "Archive" },
  py: { Icon: FileCode, colorClass: "text-yellow-500", label: "Code" },
  js: { Icon: FileCode, colorClass: "text-yellow-500", label: "Code" },
  ts: { Icon: FileCode, colorClass: "text-blue-500", label: "Code" },
  jsx: { Icon: FileCode, colorClass: "text-cyan-500", label: "Code" },
  tsx: { Icon: FileCode, colorClass: "text-cyan-500", label: "Code" },
  java: { Icon: FileCode, colorClass: "text-red-400", label: "Code" },
  c: { Icon: FileCode, colorClass: "text-blue-400", label: "Code" },
  cpp: { Icon: FileCode, colorClass: "text-blue-400", label: "Code" },
};

/**
 * MIME → kind, as an ORDERED table rather than a branch chain.
 *
 * Order is load-bearing and mirrors the previous `if` cascade exactly:
 * `text/csv` must be tested before the generic `text/` prefix, and the
 * substring rules (presentation → spreadsheet → word → zip) stay in that
 * sequence because a single MIME can match more than one of them
 * (e.g. `application/vnd.openxmlformats-officedocument.presentationml.
 * presentation` contains both "presentation" and "document").
 */
const _MIME_RULES: ReadonlyArray<
  readonly [match: (mime: string) => boolean, kind: FileKind]
> = [
  [(mime) => mime === "application/pdf", _BY_EXT.pdf],
  [(mime) => mime.startsWith("video/"), _BY_EXT.mp4],
  [(mime) => mime.startsWith("audio/"), _BY_EXT.mp3],
  [(mime) => mime.startsWith("image/"), _BY_EXT.png],
  [(mime) => mime === "text/csv", _BY_EXT.csv],
  [(mime) => mime.startsWith("text/"), _BY_EXT.txt],
  [
    (mime) => mime.includes("presentation") || mime.includes("powerpoint"),
    _BY_EXT.pptx,
  ],
  [
    (mime) => mime.includes("spreadsheet") || mime.includes("excel"),
    _BY_EXT.xlsx,
  ],
  [(mime) => mime.includes("word") || mime.includes("document"), _BY_EXT.docx],
  [(mime) => mime.includes("zip") || mime.includes("compressed"), _BY_EXT.zip],
];

function _kindFromMime(mime: string): FileKind | null {
  if (!mime) return null;
  return _MIME_RULES.find(([match]) => match(mime))?.[1] ?? null;
}

function _kindFromName(name: string): FileKind | null {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = name.slice(dot + 1).toLowerCase();
  return _BY_EXT[ext] ?? null;
}

/** Classify by MIME first (available during dragover), then by filename. */
export function fileKind({
  mime,
  name,
}: {
  mime?: string | null;
  name?: string | null;
}): FileKind {
  return (
    _kindFromMime(mime ?? "") ?? (name ? _kindFromName(name) : null) ?? _DEFAULT
  );
}
