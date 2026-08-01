import { useTranslation } from "react-i18next";
import { CircleUserRound, Mail, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import InfoRow from "./InfoRow";
import type { ProfileView } from "./types";

export default function PersonalInfoSection({ view }: { view: ProfileView }) {
  const { t } = useTranslation();
  const { me, isLoading, displayName, fullName, bio } = view;

  return (
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
  );
}
