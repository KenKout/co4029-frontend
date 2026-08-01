import { FileCode, Video } from "lucide-react";

import type { MaterialUploadInit } from "@/lib/api/types";

import type { KgEdgeState, KgEdgeVariant } from "./types";

/**
 * Static lookup tables for the material hub, extracted verbatim from the former
 * 1422-line material-hub.tsx. Keeping them here lets the badge, form, progress
 * and knowledge-graph modules share one definition, and replaces the long
 * ternary chains the components used to inline.
 */

export const PROC_STATUS: Record<string, { color: string; spin?: boolean }> = {
  not_queued: { color: "bg-amber-50 text-amber-600" },
  pending: { color: "bg-blue-50 text-blue-700", spin: true },
  extracting: { color: "bg-blue-100 text-blue-700", spin: true },
  chunking: { color: "bg-blue-100 text-blue-800", spin: true },
  embedding: { color: "bg-blue-100 text-blue-800", spin: true },
  building_kg: { color: "bg-fuchsia-100 text-fuchsia-700", spin: true },
  ready: { color: "bg-emerald-100 text-emerald-700" },
  failed: { color: "bg-red-100 text-red-700" },
};

export const MATERIAL_TYPE_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  video: Video,
  code: FileCode,
};

export const MATERIAL_TYPE_OPTIONS: ReadonlyArray<{
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

// Live percent published by the worker per stage (Redis-backed, real-time).
// Falls back to a per-stage floor when the number isn't present yet so the
// bar never reads 0% once a stage is underway.
export const STAGE_FLOOR: Record<string, number> = {
  pending: 5,
  extracting: 10,
  chunking: 30,
  embedding: 60,
  enriching: 80,
  building_kg: 95,
  ready: 100,
};

/** Statuses that mean the worker is still busy — drives the pulsing bar. */
export const PROCESSING_IN_FLIGHT: readonly string[] = [
  "pending",
  "extracting",
  "chunking",
  "embedding",
  "enriching",
  "building_kg",
];

/**
 * Stage → caption key. `building_kg` is deliberately absent: its caption gets
 * the live "N/M" tally appended, so the bar renders it separately.
 */
export const PROCESSING_STAGE_LABEL_KEY: Record<string, string> = {
  enriching: "teacher_lesson_materials.processing.enriching",
  embedding: "teacher_lesson_materials.processing.embedding",
  chunking: "teacher_lesson_materials.processing.chunking",
  extracting: "teacher_lesson_materials.processing.extracting",
};

export const PROCESSING_STAGE_FALLBACK_KEY =
  "teacher_lesson_materials.processing.queued";

/** Viewport of the compact KG preview SVG (its viewBox, not CSS pixels). */
export const KG_W = 340;
export const KG_H = 240;

// Edge paint, keyed by relation then by whether the edge touches the hovered
// node. Hover keeps the relation's colour identity and just deepens it for
// contrast (orange → darker amber, grey → slate).
export const KG_EDGE_STROKE: Record<
  KgEdgeVariant,
  Record<KgEdgeState, string>
> = {
  prereq: { active: "#b45309", idle: "#d97706" },
  related: { active: "#475569", idle: "#94a3b8" },
};

export const KG_EDGE_MARKER: Record<
  KgEdgeVariant,
  Record<KgEdgeState, string>
> = {
  prereq: {
    active: "url(#kg-arrow-prereq-active)",
    idle: "url(#kg-arrow-prereq)",
  },
  related: {
    active: "url(#kg-arrow-related-active)",
    idle: "url(#kg-arrow-related)",
  },
};

export const KG_EDGE_STROKE_WIDTH: Record<
  KgEdgeVariant,
  Record<KgEdgeState, number>
> = {
  prereq: { active: 1.8, idle: 1.4 },
  related: { active: 1.6, idle: 1 },
};
