import { useTranslation } from "react-i18next";
import { Copy } from "lucide-react";
import type { InvitationCodeAuthoring } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CodeRowActions } from "./CodeRowActions";
import { formatDate } from "./helpers";
import { useCodeRow } from "./use-code-row";

/** One invitation code: the code itself, its state, expiry, usage and actions. */
export function CodeRow({
  courseId,
  item,
  onEdit,
}: {
  courseId: string;
  item: InvitationCodeAuthoring;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const controller = useCodeRow(item, courseId, t);

  const limit =
    item.max_uses === null || item.max_uses === undefined
      ? "∞"
      : String(item.max_uses);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_120px_120px_120px_100px_140px] gap-4 px-5 py-3 items-center">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-mono font-semibold text-m3-on-surface truncate">
          {item.code}
        </span>
        <Button variant="ghost"
          type="button"
          onClick={controller.handleCopy}
          title={t("management_course_enrollments.codes.copy_tooltip")}
          className="text-m3-on-surface-variant hover:text-m3-primary transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <span
        className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-md w-fit",
          item.is_active
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-600",
        )}
      >
        {item.is_active
          ? t("management_course_enrollments.codes.active")
          : t("management_course_enrollments.codes.disabled")}
      </span>
      <span className="text-xs text-m3-on-surface-variant">
        {formatDate(item.expires_at)}
      </span>
      <span className="text-xs text-m3-on-surface-variant">
        {item.current_uses} / {limit}
      </span>
      <span className="text-xs text-m3-on-surface-variant">
        {formatDate(item.created_at)}
      </span>
      <CodeRowActions controller={controller} onEdit={onEdit} />
    </div>
  );
}
