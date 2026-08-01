import { useTranslation } from "react-i18next";

import { KgPreviewBody } from "./KgPreviewBody";
import { KgPreviewOverlays } from "./KgPreviewOverlays";
import { KgPreviewToolbar } from "./KgPreviewToolbar";
import { useKgPreview } from "./use-kg-preview";

/**
 * Compact, glanceable knowledge-graph card for the lesson page, with expand
 * into the full-screen explorer and publish for the curated graph.
 *
 * This is the orchestrator: data fetching, state and composition. The radial
 * layout lives in `./kg-layout`, the derived geometry in
 * `./kg-preview-helpers`, the stateful clusters in `./use-kg-preview` +
 * `./use-curated-publish`, and every rendered region in its own component.
 */
export function KnowledgeGraphPreview({
  lessonId,
  readyCount,
}: {
  lessonId: string;
  readyCount: number;
}) {
  const { t } = useTranslation();
  const kg = useKgPreview(lessonId, readyCount, t);

  return (
    <div className="glass ghost-border shadow-glass rounded-xl p-6 space-y-4">
      <KgPreviewToolbar
        publish={kg.publish}
        onExpand={() => kg.setExpanded(true)}
      />

      <KgPreviewBody kg={kg} readyCount={readyCount} />

      <KgPreviewOverlays lessonId={lessonId} kg={kg} />
    </div>
  );
}
