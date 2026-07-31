import { useEffect, useMemo } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  AtSign,
  Calendar,
  CircleUserRound,
  Clock,
  Mail,
  Pencil,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileStatusBadge as StatusBadge } from "@/components/ui/status-badges";
import { useMe } from "@/lib/api/hooks/auth";
import { getAuthDisplayName, getAuthUserInitials } from "@/lib/auth";
import { useFormatDate } from "@/lib/format/date";

interface InfoRowProps {
  icon: typeof Mail;
  label: string;
  value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium text-text-strong">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

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

  const givenName = me?.profile?.given_name?.trim() ?? "";
  const familyName = me?.profile?.family_name?.trim() ?? "";
  const fullName = [givenName, familyName].filter(Boolean).join(" ");
  const bio = me?.profile?.bio?.trim() ?? "";

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

      {/* Identity card */}
      <section className="rounded-xl border border-m3-outline-variant/40 bg-white p-6">
        {isLoading || !me ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-start gap-4">
            <Avatar size="lg" className="h-16 w-16">
              {me.profile?.avatar_url && (
                <AvatarImage src={me.profile.avatar_url} alt="" />
              )}
              <AvatarFallback className="bg-primary text-base font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-headline text-xl font-bold text-text-strong">
                  {displayName}
                </h2>
                <StatusBadge status={me.status} />
              </div>
              <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-text-muted">
                <AtSign className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{me.primary_email}</span>
              </p>
            </div>
            <Link to="/settings/profile" className="shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                {t("profile.edit")}
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* Personal information */}
      <section className="rounded-xl border border-m3-outline-variant/40 bg-white p-6">
        <h3 className="font-headline text-base font-bold text-text-strong">
          {t("profile.sections.personal")}
        </h3>
        <div className="mt-2 divide-y divide-m3-outline-variant/30">
          {isLoading || !me ? (
            <div className="space-y-3 py-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : (
            <>
              <InfoRow
                icon={CircleUserRound}
                label={t("profile.fields.full_name")}
                value={fullName || displayName}
              />
              <InfoRow
                icon={Mail}
                label={t("profile.fields.email")}
                value={me.primary_email}
              />
              <InfoRow
                icon={Pencil}
                label={t("profile.fields.bio")}
                value={bio || t("profile.empty.bio")}
              />
            </>
          )}
        </div>
      </section>

      {/* Account metadata */}
      <section className="rounded-xl border border-m3-outline-variant/40 bg-white p-6">
        <h3 className="font-headline text-base font-bold text-text-strong">
          {t("profile.sections.account")}
        </h3>
        <div className="mt-2 divide-y divide-m3-outline-variant/30">
          {isLoading || !me ? (
            <div className="space-y-3 py-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <>
              <InfoRow
                icon={Calendar}
                label={t("profile.fields.joined_at")}
                value={formatDate(me.created_at)}
              />
              <InfoRow
                icon={Clock}
                label={t("profile.fields.last_login_at")}
                value={
                  me.last_login_at
                    ? formatDate(me.last_login_at)
                    : t("profile.empty.last_login")
                }
              />
            </>
          )}
        </div>
      </section>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Link to="/settings">
          <Button variant="ghost" size="sm">
            {t("profile.go_to_settings")}
          </Button>
        </Link>
        <Link to="/settings/profile">
          <Button size="sm" className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            {t("profile.edit")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
