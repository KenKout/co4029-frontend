import { useTranslation } from "react-i18next";
import { ShieldCheck, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

export default function RecoveryCodesPanel({
  codes,
  onAcknowledge,
  title,
}: {
  codes: string[];
  onAcknowledge: () => void;
  title: string;
}) {
  const { t } = useTranslation();
  const copy = useCopyToClipboard();
  return (
    <div className="space-y-4 rounded-xl border border-m3-outline-variant/30 bg-m3-secondary-fixed/30 p-5">
      <div>
        <h4 className="font-headline text-base font-bold text-m3-on-surface">
          {title}
        </h4>
        <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
          {t("settings_security.save_codes")}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-white/80 p-4 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="text-m3-on-surface">
            {code}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            copy(codes.join("\n"), t("settings_security.toasts.list_label"))
          }
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          {t("settings_security.copy_all")}
        </Button>
        <Button type="button" onClick={onAcknowledge} className="gap-2">
          <ShieldCheck className="h-4 w-4" />
          {t("settings_security.saved")}
        </Button>
      </div>
    </div>
  );
}
