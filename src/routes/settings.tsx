import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Bell, ChevronRight, Shield, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";

interface HubCard {
  to: "/settings/profile" | "/settings/security" | "/settings/notifications";
  icon: typeof User;
  titleKey: string;
  bodyKey: string;
}

const CARDS: HubCard[] = [
  {
    to: "/settings/profile",
    icon: User,
    titleKey: "settings_hub.cards.profile_title",
    bodyKey: "settings_hub.cards.profile_body",
  },
  {
    to: "/settings/security",
    icon: Shield,
    titleKey: "settings_hub.cards.security_title",
    bodyKey: "settings_hub.cards.security_body",
  },
  {
    to: "/settings/notifications",
    icon: Bell,
    titleKey: "settings_hub.cards.notifications_title",
    bodyKey: "settings_hub.cards.notifications_body",
  },
];

export default function SettingsHubPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();

  // Settings hub is reachable from many places (sidebar, profile menu).
  // Prefer real history; fall back to dashboard for direct loads.
  function goBack() {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      void navigate({ to: "/dashboard" });
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6 pb-12">
      <PageHeader
        title={t("settings_hub.title")}
        subtitle={t("settings_hub.subtitle")}
        onBack={goBack}
      />

      <div className="space-y-3">
        {CARDS.map(({ to, icon: Icon, titleKey, bodyKey }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-4 rounded-xl bg-card ghost-border p-5 shadow-editorial transition-all duration-200 hover:-translate-y-0.5 hover:border-m3-primary/40 hover:shadow-md"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-m3-primary-fixed text-m3-primary transition-colors group-hover:bg-m3-primary group-hover:text-white">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-headline font-bold text-text-strong">
                {t(titleKey)}
              </p>
              <p className="mt-0.5 text-sm text-text-muted">{t(bodyKey)}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-m3-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}
