import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useRouter } from "@tanstack/react-router";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { useMfaStatus } from "@/lib/api/hooks/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import DisableSection from "./_components/security/DisableSection";
import EnrollSection from "./_components/security/EnrollSection";
import RegenerateSection from "./_components/security/RegenerateSection";

export default function SettingsSecurityPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const { requiresMfa } = useAuth();
  const [hasEnrolledThisSession, setHasEnrolledThisSession] = useState(false);
  const status = useMfaStatus();

  const enrolled = status.data?.enrolled ?? false;
  const showRegenerate = enrolled || requiresMfa || hasEnrolledThisSession;

  // Settings sub-pages are typically reached from /settings; fall back there
  // if the user lands here directly (refresh / deep link) so the back button
  // never becomes a no-op.
  function goBack() {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      void navigate({ to: "/settings" });
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <PageHeader
        title={t("settings_security.title")}
        subtitle={t("settings_security.intro")}
        onBack={goBack}
      />

      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-headline text-xl font-bold text-m3-on-surface">
              {t("settings_security.two_factor_title")}
            </h2>
            <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
              {t("settings_security.two_factor_intro")}
            </p>
          </div>
          {status.isLoading ? null : enrolled ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("settings_security.enabled_badge")}
            </span>
          ) : null}
        </div>

        {status.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-m3-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("settings_security.loading_status")}
          </div>
        ) : enrolled ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-100">
              {t("settings_security.already_enrolled")}
            </p>
            <DisableSection
              onDisabled={() => {
                setHasEnrolledThisSession(false);
                void status.refetch();
              }}
            />
          </div>
        ) : (
          <EnrollSection
            onEnrolled={() => {
              setHasEnrolledThisSession(true);
              void status.refetch();
            }}
          />
        )}
      </Card>

      {showRegenerate && (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-headline text-xl font-bold text-m3-on-surface">
              {t("settings_security.recovery_codes_title")}
            </h2>
            <p className="mt-1 text-sm font-medium text-m3-on-surface-variant">
              {t("settings_security.recovery_codes_intro")}
            </p>
          </div>
          <RegenerateSection />
        </Card>
      )}
    </div>
  );
}
