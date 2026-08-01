import * as React from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Promise-based confirmation, so imperative handlers can `await` a styled
 * dialog exactly where they used to call native `confirm()`:
 *
 * ```tsx
 * const { confirm, dialog } = useConfirm();
 * async function handleRemove(id: string) {
 *   if (!(await confirm({ description: t("…confirm.delete_domain") }))) return;
 *   await remove.mutateAsync(id);
 * }
 * return <>{…}{dialog}</>;   // render the dialog once in the component
 * ```
 *
 * Why this exists alongside <ConfirmDialog>: the plain component is controlled
 * (open + onConfirm), which suits a dedicated delete button. It does NOT suit a
 * handler that has to branch mid-flow — hoisting state + splitting the callback
 * for each of those is where the native `confirm()` calls survived. This hook
 * keeps the call site's control flow intact while still rendering the real
 * accessible dialog (focus trap, scroll lock, role=alertdialog, i18n labels).
 *
 * Resolves false on cancel/dismiss, true on confirm. Unmounting resolves false.
 */
export interface ConfirmOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  confirmVariant?: "default" | "destructive";
}

export function useConfirm(defaults?: ConfirmOptions) {
  const [state, setState] = React.useState<{
    open: boolean;
    options: ConfirmOptions;
  }>({ open: false, options: {} });
  const resolverRef = React.useRef<((ok: boolean) => void) | null>(null);

  const settle = React.useCallback((ok: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setState((s) => ({ ...s, open: false }));
    resolve?.(ok);
  }, []);

  // A pending confirm must not hang forever if the component unmounts.
  React.useEffect(
    () => () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    },
    [],
  );

  const confirm = React.useCallback(
    (options?: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        // A second call while one is open supersedes it: reject the old one.
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setState({ open: true, options: { ...defaults, ...options } });
      }),
    [defaults],
  );

  const o = state.options;
  const dialog = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(next) => {
        if (!next) settle(false);
      }}
      title={o.title ?? ""}
      description={o.description}
      confirmLabel={o.confirmLabel ?? "OK"}
      cancelLabel={o.cancelLabel}
      confirmVariant={o.confirmVariant}
      onConfirm={() => settle(true)}
    />
  );

  return { confirm, dialog };
}
