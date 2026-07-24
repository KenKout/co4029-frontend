import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
  /** Controlled open state. */
  open: boolean;
  /** Notified when the user dismisses (Escape, backdrop, Cancel). */
  onOpenChange: (open: boolean) => void;
  /** Heading text. */
  title: React.ReactNode;
  /** Body copy under the heading. */
  description?: React.ReactNode;
  /** Primary action label, e.g. "Log out" or "Delete". */
  confirmLabel: React.ReactNode;
  /** Secondary action label. Defaults to a generic Cancel string. */
  cancelLabel?: React.ReactNode;
  /** Called when the user clicks confirm. The dialog stays open until `open` flips. */
  onConfirm: () => void;
  /** Visual treatment for the confirm button. Defaults to "destructive". */
  confirmVariant?: "default" | "destructive";
  /** Disables the confirm button (e.g. while a mutation runs). */
  isPending?: boolean;
  /** Optional content rendered above the action row (e.g. a spinner row). */
  extraContent?: React.ReactNode;
  /**
   * When true, clicking the backdrop (outside the popup) dismisses the dialog.
   * Off by default: AlertDialog intentionally blocks outside-click dismissal so
   * destructive confirmations can't be closed accidentally. Opt in only for
   * non-destructive dialogs (e.g. the interview start prompt) where a quick
   * outside-click cancel is the expected, harmless behaviour.
   */
  dismissOnBackdrop?: boolean;
}

/**
 * Modal confirmation dialog. Use for destructive or non-trivial user
 * actions. Built on @base-ui/react alert-dialog so it traps focus, locks
 * page scroll, and announces as `role="alertdialog"`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmVariant = "destructive",
  isPending = false,
  extraContent,
  dismissOnBackdrop = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        {/* Backdrop sits above sidebar (z-40) and below the popup. */}
        <AlertDialogPrimitive.Backdrop
          onClick={
            dismissOnBackdrop && !isPending
              ? () => onOpenChange(false)
              : undefined
          }
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <AlertDialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-m3-outline-variant/40 bg-white p-6 shadow-2xl",
            "outline-none",
            "transition-all duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <AlertDialogPrimitive.Title className="font-headline text-lg font-bold text-text-strong">
            {title}
          </AlertDialogPrimitive.Title>
          {description ? (
            <AlertDialogPrimitive.Description className="mt-2 text-sm text-text-muted">
              {description}
            </AlertDialogPrimitive.Description>
          ) : null}

          {extraContent ? <div className="mt-4">{extraContent}</div> : null}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <AlertDialogPrimitive.Close
              render={
                <Button type="button" variant="ghost" disabled={isPending}>
                  {cancelLabel ?? "Cancel"}
                </Button>
              }
            />
            <Button
              type="button"
              variant={confirmVariant}
              onClick={onConfirm}
              disabled={isPending}
              className={
                confirmVariant === "destructive"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : undefined
              }
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
