import type { LucideIcon } from "lucide-react";

/**
 * The centred icon-over-message card the domains, units and memberships tabs
 * all rendered by hand with identical markup — only the icon and the i18n
 * message differed. Same DOM, one definition.
 */
export function EmptyState({
  icon: Icon,
  message,
}: {
  icon: LucideIcon;
  message: string;
}) {
  return (
    <div className="rounded-xl border border-m3-outline-variant/40 bg-white p-10 text-center">
      <Icon className="h-10 w-10 mx-auto mb-3 text-text-muted" />
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}
