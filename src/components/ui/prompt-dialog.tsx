import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface PromptDialogProps {
  /** Controlled open state. */
  open: boolean;
  /** Notified when the user dismisses (Escape, backdrop click, Cancel). */
  onOpenChange: (open: boolean) => void;
  /** Heading text. */
  title: React.ReactNode;
  /** Body copy under the heading. */
  description?: React.ReactNode;
  /** Primary action label, e.g. "Create". */
  confirmLabel: React.ReactNode;
  /** Secondary action label. Defaults to a generic Cancel string. */
  cancelLabel?: React.ReactNode;
  /** Called when the user clicks confirm. The dialog stays open until `open` flips. */
  onConfirm: () => void;
  /** Disables the confirm button (e.g. while a mutation runs). */
  isPending?: boolean;
  /** Content rendered above the action row — typically a form field. */
  children?: React.ReactNode;
}

/**
 * Lightweight modal for quick single-field prompts (e.g. "name this before
 * creating it"). Unlike ConfirmDialog (built on AlertDialog, which
 * intentionally blocks outside-click dismissal for destructive
 * confirmations), this is built on the plain Dialog primitive so clicking
 * the backdrop closes it — appropriate for low-stakes, easily-undone
 * creation flows.
 */
export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  isPending = false,
  children,
}: PromptDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-m3-outline-variant/40 bg-white p-6 shadow-2xl",
            "outline-none",
            "transition-all duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <DialogPrimitive.Title className="font-headline text-lg font-bold text-text-strong">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-2 text-sm text-text-muted">
              {description}
            </DialogPrimitive.Description>
          ) : null}

          {children ? <div className="mt-4">{children}</div> : null}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <DialogPrimitive.Close
              render={
                <Button type="button" variant="ghost" disabled={isPending}>
                  {cancelLabel ?? "Cancel"}
                </Button>
              }
            />
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
