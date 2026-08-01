import { Check, Pencil } from "lucide-react";
import type { CourseContentModule } from "@/lib/api/types/common";
import type { UpdateModuleMutation } from "./types";
import type { ModuleTitleEditController } from "./use-module-title-edit";

/**
 * The module title in the page header: a click-to-edit `<h1>` that swaps to a
 * bare input while editing, showing the in-flight PATCH title optimistically.
 * Moved verbatim out of the former 293-line `ModuleManagePage`.
 */
export function ModuleTitleEditor({
  module,
  updateModule,
  titleEdit,
}: {
  module: CourseContentModule;
  updateModule: UpdateModuleMutation;
  titleEdit: ModuleTitleEditController;
}) {
  const {
    editingTitle,
    setEditingTitle,
    titleDraft,
    setTitleDraft,
    titleInputRef,
    startEdit,
    saveTitle,
  } = titleEdit;

  return editingTitle ? (
    <input
      ref={titleInputRef}
      value={titleDraft}
      onChange={(e) => setTitleDraft(e.target.value)}
      onBlur={saveTitle}
      onKeyDown={(e) => {
        if (e.key === "Enter") saveTitle();
        if (e.key === "Escape") {
          setEditingTitle(false);
          setTitleDraft(module.title);
        }
      }}
      className="w-full font-headline font-bold text-2xl text-m3-primary bg-transparent border-b-2 border-m3-primary outline-none py-0.5"
    />
  ) : (
    <div className="flex items-center gap-2 group">
      <h1
        className="font-headline font-bold text-2xl text-m3-on-surface cursor-text"
        onClick={startEdit}
      >
        {updateModule.isPending &&
        updateModule.variables &&
        "title" in updateModule.variables
          ? ((updateModule.variables as { title?: string }).title ??
            module.title)
          : module.title}
      </h1>
      <button
        type="button"
        onClick={startEdit}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary cursor-pointer"
      >
        {editingTitle ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Pencil className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
