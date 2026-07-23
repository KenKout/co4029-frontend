import { cn } from "@/lib/utils";

interface BridgeLineProps {
  className?: string;
  variant?: "horizontal" | "vertical";
}

export function BridgeLine({
  className,
  variant = "horizontal",
}: BridgeLineProps) {
  if (variant === "vertical") {
    return (
      <div
        className={cn(
          "w-px bg-gradient-to-b from-m3-outline-variant/10 via-m3-secondary/20 to-m3-outline-variant/10 min-h-[40px]",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "h-px bg-gradient-to-r from-m3-outline-variant/10 via-m3-secondary/20 to-m3-outline-variant/10 w-full",
        className,
      )}
    />
  );
}
