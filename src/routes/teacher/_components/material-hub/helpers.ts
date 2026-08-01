import { FileText } from "lucide-react";

import type { MaterialUploadInit } from "@/lib/api/types";

import { MATERIAL_TYPE_ICON } from "./constants";

/**
 * Pure, React-free helpers for the material hub, extracted verbatim from the
 * former 1422-line material-hub.tsx: file-type sniffing, the checksum the
 * single-shot upload sends, CORS detection and byte formatting.
 */

export function detectMaterialType(
  file: File,
): MaterialUploadInit["material_type"] {
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

export function materialIcon(type: string) {
  return MATERIAL_TYPE_ICON[type] ?? FileText;
}

export async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isLikelyCorsError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (
    err instanceof Error &&
    /Failed to fetch|NetworkError|CORS/i.test(err.message)
  ) {
    return true;
  }
  return false;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
