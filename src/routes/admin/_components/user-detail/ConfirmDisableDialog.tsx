import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function ConfirmDisableDialog({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface-elev border border-border rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-headline font-bold text-text-strong">
              {t("admin.users.confirm_disable.title")}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              {t("admin.users.confirm_disable.body")}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost"
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-3 py-1.5 text-sm font-medium rounded-md text-text-strong border border-border hover:bg-surface-muted disabled:opacity-50"
          >
            {t("common.cancel")}
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-3 py-1.5 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending
              ? t("admin.users.actions.disabling")
              : t("admin.users.actions.disable")}
          </Button>
        </div>
      </div>
    </div>
  );
}
