import { useTranslation } from "react-i18next";
import { Calendar, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import InfoRow from "./InfoRow";
import type { ProfileView } from "./types";

export default function AccountMetaSection({ view }: { view: ProfileView }) {
  const { t } = useTranslation();
  const { me, isLoading, formatDate } = view;

  return (
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
  );
}
