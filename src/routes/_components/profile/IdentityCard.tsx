import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AtSign, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileStatusBadge as StatusBadge } from "@/components/ui/status-badges";
import type { ProfileView } from "./types";

export default function IdentityCard({ view }: { view: ProfileView }) {
  const { t } = useTranslation();
  const { me, isLoading, displayName, initials } = view;

  return (
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
  );
}
