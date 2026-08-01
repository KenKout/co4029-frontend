import { Loader2 } from "lucide-react";
import type { TFunction } from "i18next";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function SideNavLogoutDialog({
  open,
  onOpenChange,
  isLoggingOut,
  onConfirm,
  t,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  isLoggingOut: boolean;
  onConfirm: () => void;
  t: TFunction;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("logout_confirm.title")}
      description={t("logout_confirm.description")}
      confirmLabel={
        isLoggingOut ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("logout_confirm.confirming")}
          </span>
        ) : (
          t("logout_confirm.confirm")
        )
      }
      cancelLabel={t("logout_confirm.cancel")}
      confirmVariant="destructive"
      isPending={isLoggingOut}
      onConfirm={onConfirm}
    />
  );
}
