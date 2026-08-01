import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** One icon toggle in the inline composer's control row. */
export function ComposerControl({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "rounded-lg border",
        active
          ? "border-primary/20 bg-primary-soft text-primary hover:bg-primary-soft-dim"
          : "border-transparent text-text-muted hover:bg-surface-muted hover:text-text-strong",
      )}
    >
      {children}
    </Button>
  );
}
