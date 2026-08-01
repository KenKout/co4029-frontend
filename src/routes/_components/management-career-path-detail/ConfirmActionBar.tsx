import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The inline "are you sure?" bar the header swaps in for publish and archive.
 * The two branches only differed by the confirm button's variant and label, so
 * the variant rides in as a prop (omitted for publish, exactly as before).
 */
export function ConfirmActionBar({
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isPending,
  variant,
}: {
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant={variant}
        onClick={onConfirm}
        disabled={isPending}
        className="gap-2"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {confirmLabel}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
        {cancelLabel}
      </Button>
    </div>
  );
}
