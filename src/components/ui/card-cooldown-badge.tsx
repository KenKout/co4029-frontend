import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCardCooldown } from "@/lib/api/cooldown";
import { cn } from "@/lib/utils";

interface CardCooldownBadgeProps {
  retryAt: string | null;
  className?: string;
}

export function CardCooldownBadge({
  retryAt,
  className,
}: CardCooldownBadgeProps) {
  const { t } = useTranslation();
  const { isExpired, formatRemaining } = useCardCooldown(retryAt);

  if (isExpired || !retryAt) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        "bg-amber-50 text-amber-700 border border-amber-200",
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      {t("cooldown.wait_prefix")} {formatRemaining()}
    </span>
  );
}
