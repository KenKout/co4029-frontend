import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EntityDialogHeader({
  title,
  onClose,
  isSubmitting,
  cancelLabel,
}: {
  title: string;
  onClose: () => void;
  isSubmitting: boolean;
  cancelLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-5 border-b border-m3-outline-variant/20">
      <h2 className="text-lg font-headline font-bold text-m3-on-surface">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="text-m3-on-surface-variant hover:text-m3-on-surface disabled:opacity-40 cursor-pointer"
        aria-label={cancelLabel}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export function EntityDialogFooter({
  pickedCount,
  isSubmitting,
  onClose,
  onConfirm,
  countLabel,
  cancelLabel,
  addLabel,
}: {
  pickedCount: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  countLabel: string;
  cancelLabel: string;
  addLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-5 border-t border-m3-outline-variant/20">
      <span className="text-xs text-m3-on-surface-variant">{countLabel}</span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isSubmitting}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onConfirm}
          disabled={pickedCount === 0 || isSubmitting}
          className="gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
