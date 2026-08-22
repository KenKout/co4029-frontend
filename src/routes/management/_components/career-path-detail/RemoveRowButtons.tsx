import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Trash icon that flips into a confirm/cancel pair, shared by the course rows
 * and the student rows. The two call sites carry slightly different layout
 * classes (`shrink-0` on the student row), so those come in as props and the
 * rendered class strings stay exactly what they were.
 *
 * Labels are passed in rather than translated here so this stays hook-free.
 */
export function RemoveRowButtons({
  confirming,
  isPending,
  confirmLabel,
  cancelLabel,
  onStartConfirm,
  onCancel,
  onRemove,
  wrapperClassName,
  triggerClassName,
}: {
  confirming: boolean;
  isPending: boolean;
  confirmLabel: string;
  cancelLabel: string;
  onStartConfirm: () => void;
  onCancel: () => void;
  onRemove: () => void;
  wrapperClassName: string;
  triggerClassName: string;
}) {
  if (confirming) {
    return (
      <div className={wrapperClassName}>
        <Button
          size="xs"
          variant="destructive"
          onClick={onRemove}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            confirmLabel
          )}
        </Button>
        <Button
          size="xs"
          variant="ghost"
          onClick={onCancel}
          disabled={isPending}
        >
          {cancelLabel}
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="xs"
      variant="ghost"
      onClick={onStartConfirm}
      className={triggerClassName}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  );
}
