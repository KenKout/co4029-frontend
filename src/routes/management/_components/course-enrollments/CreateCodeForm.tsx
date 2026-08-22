import { useTranslation } from "react-i18next";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CodesTabController } from "./use-codes-tab";

/** Form that mints a new invitation code with an optional expiry and use cap. */
export function CreateCodeForm({
  controller,
}: {
  controller: CodesTabController;
}) {
  const { t } = useTranslation();
  const {
    create,
    code,
    setCode,
    expiresAt,
    setExpiresAt,
    maxUses,
    setMaxUses,
    handleCreate,
  } = controller;

  return (
    <form
      onSubmit={handleCreate}
      className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-4"
    >
      <h2 className="text-sm font-bold text-m3-on-surface">
        {t("management_course_enrollments.codes.create_title")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_course_enrollments.codes.col_code")}{" "}
            <span className="text-red-600">*</span>
          </label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t(
              "management_course_enrollments.codes.code_placeholder",
            )}
            className="font-mono"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_course_enrollments.codes.expires_label")}
          </label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_course_enrollments.codes.max_uses_label")}
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
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={create.isPending}
          className="gap-2"
        >
          {create.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t("management_course_enrollments.codes.create_button")}
        </Button>
      </div>
    </form>
  );
}
