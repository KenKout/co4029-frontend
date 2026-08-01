import { Check, Copy, Loader2, Pencil } from "lucide-react";
import type { ModuleAccordionController } from "./use-module-accordion";
import type { TranslateFn } from "./types";

/**
 * Trailing header buttons: the pencil that starts inline title editing, and
 * duplicate — which deep-clones the module + all items as a new draft. Moved
 * verbatim out of `ModuleAccordion`.
 */
export function ModuleHeaderActions({
  editingTitle,
  duplicateModule,
  onStartEditTitle,
  onDuplicate,
  t,
}: {
  editingTitle: boolean;
  duplicateModule: ModuleAccordionController["duplicateModule"];
  onStartEditTitle: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
  t: TranslateFn;
}) {
  return (
    <>
      <button
        type="button"
        title={t("teacher_common.rename_module")}
        onClick={onStartEditTitle}
        className="shrink-0 p-1 rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary transition-colors"
      >
        {editingTitle ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Pencil className="h-3.5 w-3.5" />
        )}
      </button>

      <button
        type="button"
        title={t("teacher_common.duplicate_module", "Duplicate module")}
        onClick={onDuplicate}
        disabled={duplicateModule.isPending}
        className="shrink-0 p-1 rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary transition-colors disabled:opacity-50"
      >
        {duplicateModule.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </>
  );
}
