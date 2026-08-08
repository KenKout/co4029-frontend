import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";

import { SetupChecklist } from "@/components/interview/setup-checklist";
import { cn } from "@/lib/utils";

/**
 * The pre-interview checklist, as a modal.
 *
 * `AlertDialog` rather than `Dialog` on purpose: there is no dismissal here.
 * Backdrop clicks and Escape are ignored because leaving setup half-finished
 * strands the candidate on a screen whose composer cannot submit — the way out is
 * the checklist's own "Skip setup" action, which the backend also records.
 *
 * The checklist supplies its own heading and chrome, so this wrapper adds only
 * the portal, the scrim and a screen-reader title.
 */
export function SetupChecklistDialog({
  open,
  ...checklist
}: { open: boolean } & React.ComponentProps<typeof SetupChecklist>) {
  return (
    <AlertDialogPrimitive.Root open={open}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <AlertDialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-xl",
            "-translate-x-1/2 -translate-y-1/2 overflow-y-auto outline-none",
            "transition-all duration-200",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
          )}
        >
          <AlertDialogPrimitive.Title className="sr-only">
            {checklist.candidateName}
          </AlertDialogPrimitive.Title>
          <SetupChecklist {...checklist} />
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
