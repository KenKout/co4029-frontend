import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { statusToken, type StatusTokenMap } from "@/lib/status-tokens";

/** Text scale. Named by role, not by CSS value, so a third step can be added
 *  without the "xs" | "11px" | "13px" awkwardness. sm = 11px, md = xs. */
export type StatusBadgeSize = "sm" | "md";

const SIZE_CLASS: Record<StatusBadgeSize, string> = {
  sm: "text-[11px]",
  md: "text-xs",
};

export interface StatusBadgeProps {
  status: string | undefined;
  /** Domain colour map from lib/status-tokens. */
  tokens: StatusTokenMap;
  /** Pre-resolved, i18n'd label text. Defaults to the raw status. */
  label?: string;
  /** Optional leading icon (e.g. ShieldCheck on the profile badge). */
  icon?: LucideIcon;
  size?: StatusBadgeSize;
  /** Square chip (rounded-md, the common case) or full pill (rounded-full). */
  shape?: "square" | "pill";
  className?: string;
}

/**
 * Shared status pill/chip. Consolidates the near-identical local `StatusBadge`
 * components that differed only in: the colour-token map, the i18n label, the
 * text size, pill vs square corners, and an optional leading icon.
 *
 * Most call sites should use a bound badge from `makeStatusBadge` instead of
 * wiring `tokens` + `label` by hand — see below.
 */
export function StatusBadge({
  status,
  tokens,
  label,
  icon: Icon,
  size = "md",
  shape = "square",
  className,
}: StatusBadgeProps) {
  const cls = statusToken(tokens, status);
  const pill = shape === "pill";
  return (
    <span
      className={cn(
        "font-semibold",
        pill
          ? "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
          : "inline-block rounded-md px-2 py-0.5",
        SIZE_CLASS[size],
        cls,
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label ?? status}
    </span>
  );
}

/**
 * Bind a token map + i18n key prefix (+ default size/shape/icon) into a
 * ready-to-use badge component.
 *
 * This removes the 6-line local wrapper that each gated page was declaring just
 * to re-bind the same three things:
 *
 *     const UserStatusBadge = makeStatusBadge(USER_STATUS_TOKENS,
 *       "admin.users.status", { size: "sm" });
 *     // call site
 *     <UserStatusBadge status={u.status} />
 *
 * The label is resolved as `t(`${i18nPrefix}.${status}`, { defaultValue: status })`
 * — the exact shape every wrapper used. `labelPrefix` stays a required argument
 * so a page can't silently inherit another page's namespace. Pass
 * `i18nPrefix: null` for badges that render the raw status (the job badges).
 */
export function makeStatusBadge(
  tokens: StatusTokenMap,
  /** i18n key prefix, or null to render the raw status verbatim. */
  i18nPrefix: string | null,
  defaults?: {
    size?: StatusBadgeSize;
    shape?: "square" | "pill";
    icon?: LucideIcon;
  },
) {
  function BoundStatusBadge({
    status,
    ...rest
  }: Omit<StatusBadgeProps, "tokens" | "label"> & { label?: string }) {
    const { t } = useTranslation();
    const label =
      rest.label ??
      (i18nPrefix
        ? t(`${i18nPrefix}.${status}`, { defaultValue: status ?? "" })
        : undefined);
    return (
      <StatusBadge
        status={status}
        tokens={tokens}
        label={label}
        size={defaults?.size}
        shape={defaults?.shape}
        icon={defaults?.icon}
        {...rest}
      />
    );
  }
  return BoundStatusBadge;
}
