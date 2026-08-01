import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function useCopyToClipboard() {
  const { t } = useTranslation();
  return (value: string, label: string) => {
    void navigator.clipboard.writeText(value).then(
      () =>
        toast.success(t("settings_security.toasts.copied_label", { label })),
      () => toast.error(t("settings_security.toasts.copy_failed")),
    );
  };
}
