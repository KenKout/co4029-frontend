import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { PolicyVersionStatus } from "@/lib/api/hooks/policies";

/**
 * A version's status, with its number.
 *
 * The number is part of the badge rather than a separate label because the two
 * are never useful apart: "Published" without "v3" does not tell an admin
 * whether their last release actually went out.
 */
const TONE: Record<PolicyVersionStatus, string> = {
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-amber-50 text-amber-800 border-amber-200",
  archived: "bg-m3-surface-container-high text-m3-on-surface-variant border-transparent",
};

export function PolicyStatusBadge({
  status,
  version,
  className,
}: {
  status: PolicyVersionStatus;
  version?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        TONE[status],
        className,
      )}
    >
      {t(`admin.policies.status_label.${status}`)}
      {version !== undefined ? <span className="font-mono">v{version}</span> : null}
    </span>
  );
}
