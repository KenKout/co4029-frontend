import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";

/** Brand mark plus the "verify your second factor" heading. */
export default function MfaBrandHeader() {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex justify-center">
        <Link
          to="/"
          className="font-headline text-3xl font-black tracking-tighter text-m3-primary"
          search={{}}
        >
          aBridgeAI
        </Link>
      </div>

      <header className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-m3-secondary-fixed text-m3-secondary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-m3-on-surface">
          {t("login_mfa.title")}
        </h1>
        <p className="mt-2 text-sm font-medium text-m3-on-surface-variant">
          {t("login_mfa.subtitle")}
        </p>
      </header>
    </>
  );
}
