import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AI-processing status badge shown on a resource that's also in the AI Hub.
 * `status` is the correlated material's version processing_status; `undefined`
 * means the resource is NOT synced to AI (rendered as an "off" chip).
 */
export function AiStatusBadge({ status }: { status: string | undefined }) {
  const { t } = useTranslation();
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-m3-surface-container-high text-m3-on-surface-variant">
        {t("teacher_lesson_manage.ai_badge.off")}
      </span>
    );
  }
  const ready = status === "ready";
  const failed = status === "failed" || status === "cancelled";
  const cls = ready
    ? "bg-emerald-100 text-emerald-700"
    : failed
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";
  const label = ready
    ? t("teacher_lesson_manage.ai_badge.ready")
    : failed
      ? t("teacher_lesson_manage.ai_badge.failed")
      : t("teacher_lesson_manage.ai_badge.processing");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
        cls,
      )}
    >
      {!ready && !failed && (
        <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
