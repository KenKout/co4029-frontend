import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InvitationCodeAuthoring } from "@/lib/api/types";
import { useEditCodeForm } from "./use-edit-code-form";

/** Modal for toggling a code's active flag and revising its expiry / use cap. */
export function EditCodeModal({
  courseId,
  item,
  onClose,
}: {
  courseId: string;
  item: InvitationCodeAuthoring;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const controller = useEditCodeForm(item, courseId, t, onClose);
  const {
    patch,
    isActive,
    setIsActive,
    expiresAt,
    setExpiresAt,
    maxUses,
    setMaxUses,
    handleSubmit,
  } = controller;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-popover rounded-xl shadow-lg p-6 space-y-5"
      >
        <div>
          <h2 className="text-lg font-headline font-bold text-m3-on-surface">
            {t("management_course_enrollments.codes.edit_title")}
          </h2>
          <p className="text-xs text-m3-on-surface-variant font-mono mt-1">
            {item.code}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-m3-outline-variant accent-m3-primary"
          />
          <span className="font-medium text-m3-on-surface">
            {t("management_course_enrollments.codes.active")}
          </span>
        </label>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_course_enrollments.codes.col_expires")}
          </label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_course_enrollments.codes.max_uses_label_short")}
          </label>
          <Input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder={t(
              "management_course_enrollments.codes.max_uses_placeholder",
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={patch.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={patch.isPending}
            className="gap-2"
          >
            {patch.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
