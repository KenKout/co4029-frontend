import * as React from "react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Guards an action that would discard unsaved edits.
 *
 * Authoring screens in this app keep local drafts that are only persisted on an
 * explicit Save, so leaving (closing an editor, switching tabs, navigating away)
 * silently threw work away. This centralises the "Are you sure you want to
 * quit?" confirmation so every such screen behaves identically instead of each
 * one hand-rolling its own dialog and its own dirty check.
 *
 * Usage:
 *
 * ```tsx
 * const guard = useUnsavedChangesGuard(isDirty);
 * // ...
 * <button onClick={() => guard.run(() => setTab("preview"))}>Preview</button>
 * {guard.dialog}
 * ```
 *
 * `run` executes the action immediately when there's nothing to lose, so the
 * dialog never nags on a clean screen. When dirty, the action is held until the
 * user confirms.
 *
 * Also installs a `beforeunload` handler while dirty, so a browser-level
 * reload/close gets the native warning — an in-app dialog can't cover that.
 */
export interface UnsavedChangesGuard {
  /** Run `action` now if clean, otherwise ask for confirmation first. */
  run: (action: () => void) => void;
  /** Mount this once in the component tree. */
  dialog: React.ReactNode;
  /** True while the confirmation is on screen. */
  isAsking: boolean;
  /** Drop any held action and close the dialog. */
  cancel: () => void;
}

export function useUnsavedChangesGuard(
  isDirty: boolean,
  options?: {
    /** Override the dialog heading. */
    title?: React.ReactNode;
    /** Override the body copy. */
    description?: React.ReactNode;
    /** Override the confirm (discard) label. */
    confirmLabel?: React.ReactNode;
    /**
     * Skip the native reload/close warning. Off by default because losing work
     * to an accidental Cmd-R is exactly what this guard exists to prevent.
     */
    disableBeforeUnload?: boolean;
  },
): UnsavedChangesGuard {
  const { t } = useTranslation();
  const [pendingAction, setPendingAction] = React.useState<
    (() => void) | null
  >(null);

  // Keep the latest dirty flag in a ref so `run` stays referentially stable —
  // callers often pass it straight into a memoised child.
  const dirtyRef = React.useRef(isDirty);
  React.useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  const run = React.useCallback((action: () => void) => {
    if (!dirtyRef.current) {
      action();
      return;
    }
    // Store the thunk itself. The extra arrow matters: a bare setState(fn)
    // would treat `fn` as an updater and call it immediately.
    setPendingAction(() => action);
  }, []);

  const cancel = React.useCallback(() => setPendingAction(null), []);

  const confirm = React.useCallback(() => {
    // Snapshot before clearing: running the action can unmount this component
    // (e.g. it closes the editor), and we must not touch state afterwards.
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  }, [pendingAction]);

  // Native guard for reload / tab close, which no in-app dialog can intercept.
  React.useEffect(() => {
    if (options?.disableBeforeUnload || !isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers show their own generic string; returnValue is still
      // required for the prompt to appear at all in some engines.
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, options?.disableBeforeUnload]);

  const dialog = (
    <ConfirmDialog
      open={pendingAction !== null}
      onOpenChange={(next) => {
        if (!next) setPendingAction(null);
      }}
      title={options?.title ?? t("common.unsaved.title", "Are you sure you want to quit?")}
      description={
        options?.description ??
        t(
          "common.unsaved.description",
          "You have unsaved changes. If you quit now, they will be lost.",
        )
      }
      confirmLabel={options?.confirmLabel ?? t("common.unsaved.quit", "Quit")}
      cancelLabel={t("common.cancel", "Cancel")}
      confirmVariant="destructive"
      onConfirm={confirm}
    />
  );

  return { run, dialog, isAsking: pendingAction !== null, cancel };
}

export default useUnsavedChangesGuard;
