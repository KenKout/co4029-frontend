import type { TFunction } from "i18next";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { useTeacherLessonKnowledgeGraph } from "@/lib/api/hooks/materials";
import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

import type { KgSource } from "../knowledge-graph-detail";
import type { KgPreviewDerived } from "./kg-preview-helpers";
import { deriveKgPreview } from "./kg-preview-helpers";
import type { CuratedPublishController } from "./use-curated-publish";
import { useCuratedPublish } from "./use-curated-publish";

/**
 * Everything {@link KnowledgeGraphPreview} needs: the two graph fetches, the
 * card's view state, the curated publish cluster and the per-render layout
 * projection. Extracted verbatim from the former 1422-line material-hub.tsx.
 *
 * Hook call order is preserved EXACTLY as it was inline: preview graph →
 * hovered → expanded → kgSource → editing → detail graph → curated draft →
 * save → publish → confirm dialog state.
 */
export interface KgPreviewController extends KgPreviewDerived {
  data: LessonKnowledgeGraph | undefined;
  isLoading: boolean;
  detailData: LessonKnowledgeGraph | undefined;
  hovered: string | null;
  setHovered: Dispatch<SetStateAction<string | null>>;
  expanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
  kgSource: KgSource;
  setKgSource: Dispatch<SetStateAction<KgSource>>;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<boolean>>;
  publish: CuratedPublishController;
}

export function useKgPreview(
  lessonId: string,
  readyCount: number,
  t: TFunction,
): KgPreviewController {
  const { data, isLoading } = useTeacherLessonKnowledgeGraph(
    lessonId,
    readyCount,
  );
  const [hovered, setHovered] = useState<string | null>(null);
  // Full-screen explorer. Only opened on demand, and it fetches the fuller
  // graph (higher node limit) so "expand" actually shows more than the preview.
  const [expanded, setExpanded] = useState(false);
  // Which graph the detail screen is showing: the AI-derived concept graph
  // (read-only) or the teacher's curated graph (editable / publishable).
  const [kgSource, setKgSource] = useState<KgSource>("ai");
  // Teacher-curated KG editor, launched from inside the detail screen.
  const [editing, setEditing] = useState(false);
  const { data: detailData } = useTeacherLessonKnowledgeGraph(
    lessonId,
    readyCount,
    expanded ? 60 : undefined,
  );
  const publish = useCuratedPublish(lessonId, t);

  const derived = deriveKgPreview(data, hovered);

  return {
    data,
    isLoading,
    detailData,
    hovered,
    setHovered,
    expanded,
    setExpanded,
    kgSource,
    setKgSource,
    editing,
    setEditing,
    publish,
    ...derived,
  };
}
