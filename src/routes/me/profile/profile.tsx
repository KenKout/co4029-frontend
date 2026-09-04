import { useEffect, useMemo } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/api/hooks/auth";
import { getAuthDisplayName, getAuthUserInitials } from "@/lib/auth";
import { useFormatDate } from "@/lib/format/date";
import AccountMetaSection from "./_components/profile/AccountMetaSection";
import ExternalLinksSection from "./_components/profile/ExternalLinksSection";
import IdentityCard from "./_components/profile/IdentityCard";
import PersonalInfoSection from "./_components/profile/PersonalInfoSection";
import ProfileFooterActions from "./_components/profile/ProfileFooterActions";
import { deriveProfileNames } from "./_components/profile/helpers";

export default function ProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const { data: me, isLoading, isError } = useMe();

  // Profile is reachable from the avatar dropdown anywhere in the app.
  // Prefer real history; fall back to dashboard for direct loads.
  function goBack() {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      void navigate({ to: "/dashboard" });
    }
  }

  // If the /users/me query fails (e.g. session expired), bounce to dashboard
  // so the auth gate can re-redirect to /login.
  useEffect(() => {
    if (isError) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [isError, navigate]);

  const displayName = useMemo(() => getAuthDisplayName(me ?? null), [me]);
  const initials = useMemo(() => getAuthUserInitials(me ?? null), [me]);

  const view = {
    me,
    isLoading,
    displayName,
    initials,
    formatDate,
    ...deriveProfileNames(me),
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6 pb-12">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goBack}
          aria-label={t("profile.back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-m3-on-surface-variant">
          {t("profile.back")}
        </span>
      </div>

      <header>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-m3-on-surface">
          {t("profile.title")}
        </h1>
        <p className="mt-2 text-sm font-medium text-m3-on-surface-variant">
          {t("profile.subtitle")}
        </p>
      </header>

      <IdentityCard view={view} />
      <PersonalInfoSection view={view} />
      <ExternalLinksSection view={view} />
      <AccountMetaSection view={view} />
      <ProfileFooterActions />
    </div>
  );
}
