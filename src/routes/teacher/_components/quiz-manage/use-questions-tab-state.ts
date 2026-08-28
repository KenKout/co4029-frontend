import { useCallback, useEffect, useState } from "react";

/**
 * Per-question unsaved-edit tracking plus the frozen count behind the
 * bulk-delete confirm dialog. Extracted from QuestionsTab; the hook call order
 * matches what the tab used inline (dirtyIds → confirmBulkDelete → mirror
 * effect → unmount reset → dirty reporter).
 */
export function useQuestionsTabState(
  onDirtyCountChange?: (count: number) => void,
) {
  // Which questions have unsaved local edits. Owned here (not in each card) so
  // the navigator can render a Saved/Unsaved layer; each card reports its own
  // dirty state up via onDirtyChange.
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  // Cards the teacher actually edited. Separate from `dirtyIds`, which also
  // counts pre-filled defaults the row does not have yet: those need a Save
  // (the banner says so) but must NOT make a tab switch claim there is work
  // to lose.
  const [userEditIds, setUserEditIds] = useState<Set<string>>(() => new Set());
  // Bulk delete is gated behind a confirm dialog (see handler below). The
  // count is frozen when the dialog opens: the confirm handler clears the
  // selection, and reading live `selectedIds.size` would make the dialog copy
  // flicker to "Delete 0 questions?" during the close animation.
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<number | null>(
    null,
  );
  // Mirror the dirty-card count up to the page, which owns the tab strip and
  // needs it to decide whether switching away would discard work. Reset on
  // unmount so a confirmed "Quit" doesn't leave the parent armed with a stale
  // count after this subtree is gone.
  useEffect(() => {
    onDirtyCountChange?.(userEditIds.size);
  }, [userEditIds.size, onDirtyCountChange]);
  useEffect(() => {
    return () => onDirtyCountChange?.(0);
  }, [onDirtyCountChange]);

  const handleDirtyChange = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((prev) => {
      if (dirty === prev.has(id)) return prev; // no-op keeps referential identity
      const next = new Set(prev);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleUserEditChange = useCallback((id: string, edited: boolean) => {
    setUserEditIds((prev) => {
      if (edited === prev.has(id)) return prev;
      const next = new Set(prev);
      if (edited) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  return {
    dirtyIds,
    userEditIds,
    confirmBulkDelete,
    setConfirmBulkDelete,
    handleDirtyChange,
    handleUserEditChange,
  };
}
