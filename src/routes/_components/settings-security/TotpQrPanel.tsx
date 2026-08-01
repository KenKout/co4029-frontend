import { useTranslation } from "react-i18next";
import { KeyRound, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";

export default function TotpQrPanel({
  otpauthUrl,
  secret,
  copy,
}: {
  otpauthUrl: string;
  secret: string;
  copy: (value: string, label: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-m3-outline-variant/30 bg-white p-4 sm:flex-row sm:items-start sm:gap-5">
      <div className="rounded-lg bg-white p-2 ring-1 ring-m3-outline-variant/20">
        <QRCodeSVG value={otpauthUrl} size={176} level="M" marginSize={2} />
      </div>
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-widest text-m3-secondary">
          {t("settings_security.manual_entry_label")}
        </p>
        <p className="break-all rounded-md bg-m3-surface-container-low px-2 py-1 font-mono text-sm text-m3-on-surface">
          {secret}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              copy(secret, t("settings_security.toasts.secret_label"))
            }
            className="gap-2"
          >
            <Copy className="h-3.5 w-3.5" />
            {t("settings_security.copy_secret")}
          </Button>
          <a
            href={otpauthUrl}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-m3-primary hover:bg-muted"
          >
            <KeyRound className="h-4 w-4" />
            {t("settings_security.open_in_app")}
          </a>
        </div>
      </div>
    </div>
  );
}
