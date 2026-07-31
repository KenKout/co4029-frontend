import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusToken, type StatusTokenMap } from "@/lib/status-tokens";

export function StatusBadge({
  status,
  tokens,
  label,
  icon: Icon,
  size = "xs",
  shape = "square",
  className,
}: {
  status: string | undefined;
  /** Domain colour map from lib/status-tokens. */
  tokens: StatusTokenMap;
  /** Pre-resolved, i18n'd label text. Defaults to the raw status. */
  label?: string;
  /** Optional leading icon (e.g. ShieldCheck on the profile badge). */
  icon?: LucideIcon;
  /** Text size: the two variants in the wild were text-[11px] and text-xs. */
  size?: "xs" | "11px";
  /** Square chip (rounded-md, the common case) or full pill (rounded-full). */
  shape?: "square" | "pill";
  className?: string;
}) {
  const cls = statusToken(tokens, status);
  const pill = shape === "pill";
  return (
    <span
      className={cn(
        "font-semibold",
        pill
          ? "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
          : "inline-block rounded-md px-2 py-0.5",
        size === "11px" ? "text-[11px]" : "text-xs",
        cls,
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label ?? status}
    </span>
  );
}
