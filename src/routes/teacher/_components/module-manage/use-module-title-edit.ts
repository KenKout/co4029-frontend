import { useRef, useState } from "react";
import { toast } from "sonner";
import type { CourseContentModule } from "@/lib/api/types/common";
import type { UpdateModuleMutation } from "./types";

/**
 * Inline module-title editing for the page header: the draft, the open flag and
 * the focus ref, plus the enter/blur save that only PATCHes when the trimmed
 * title actually changed.
 *
 * Extracted from the former 293-line `ModuleManagePage`. The three hook calls
 * stay in their original relative order (`useState`, `useState`, `useRef`) and
 * `module` is still optional here, so the `module!` assertions the page relied
 * on are carried over unchanged.
 */
export function useModuleTitleEdit(options: {
  module: CourseContentModule | undefined;
  updateModule: UpdateModuleMutation;
}) {
  const { module, updateModule } = options;
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setTitleDraft(module!.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  function saveTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== module!.title) {
      updateModule.mutate(
        { title: trimmed },
        {
          onError: (err) => toast.error((err as Error).message),
        },
      );
    }
  }

  return {
    editingTitle,
    setEditingTitle,
    titleDraft,
    setTitleDraft,
    titleInputRef,
    startEdit,
    saveTitle,
  };
}

export type ModuleTitleEditController = ReturnType<typeof useModuleTitleEdit>;
