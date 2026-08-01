import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { CuratedKGRelation } from "@/lib/api/types";

import { relationLabel } from "./helpers";

/**
 * Validation / mode banner. Arrow mode takes precedence and explains the next
 * click; otherwise the exactly-one-primary validation message shows.
 */
export function EditorBanner({
  arrowMode,
  linkSource,
  arrowRelation,
  validationError,
}: {
  arrowMode: boolean;
  linkSource: string | null;
  arrowRelation: CuratedKGRelation;
  validationError: string | null;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "px-4 py-2 text-xs font-semibold",
        arrowMode
          ? "bg-m3-primary/10 text-m3-primary"
          : "bg-amber-50 text-amber-800",
      )}
    >
      {arrowMode
        ? linkSource
          ? t("teacher_kg_editor.arrow_pick_target", {
              relation: relationLabel(t, arrowRelation),
            })
          : t("teacher_kg_editor.arrow_pick_source")
        : validationError}
    </div>
  );
}
