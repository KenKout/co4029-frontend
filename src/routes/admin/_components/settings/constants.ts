import type { SettingSource } from "@/lib/api/hooks/admin-settings";

/**
 * Constant tables for the admin runtime-settings page: the registry group
 * order and its English fallback headings, the per-source badge palette, the
 * ingest note shown once per section, and the scroll-spy offsets. Extracted
 * verbatim from the former 946-line settings.tsx.
 */

export const GROUP_ORDER = [
  "ai",
  "chunking",
  "preprocessing",
  "knowledge_graph",
  "retrieval",
  "spaced_repetition",
  "notifications",
] as const;

export const GROUP_LABELS: Record<string, string> = {
  ai: "AI models",
  chunking: "Chunking",
  preprocessing: "Preprocessing",
  knowledge_graph: "Knowledge graph",
  retrieval: "Retrieval",
  spaced_repetition: "Spaced repetition",
  notifications: "Notifications",
};

// A few groups only take effect on the next ingest of a document — changing
// them never rewrites existing content. Stated once per section instead of a
// badge shouting on every row.
export const REPROCESS_NOTE =
  "Changes apply to the next ingest, not to already-processed content.";

export const SOURCE_META: Record<
  SettingSource,
  { label: string; badge: string; dot: string }
> = {
  organization: {
    label: "org override",
    badge: "bg-indigo-100 text-indigo-700",
    dot: "bg-indigo-500",
  },
  global: {
    label: "global",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  environment: {
    label: "env var",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  default: {
    label: "built-in",
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
};

// Scroll-spy geometry for the section rail. A global sticky header
// (ContentTopBar, 64px) sits above the scroll container, so both the jump
// target and the activation line must clear it. HEADER_OFFSET is where a
// jumped-to section top comes to rest (header height + a little breathing
// room); SPY_TOLERANCE is a band below that within which a section still
// counts as "active". The tolerance MUST exceed the jump landing point,
// otherwise the section you just clicked lands a few px short of the
// activation line and never highlights (the original bug: landed at +8 but
// activated only at <= +4).
export const HEADER_OFFSET = 80;
export const SPY_TOLERANCE = HEADER_OFFSET + 12;
