import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUpdateProfile } from "@/lib/api/hooks/auth";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const updateProfile = useUpdateProfile();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? "en")
    .split("-")[0]
    .toLowerCase() as SupportedLocale;

  const handleChange = (lng: SupportedLocale) => {
    void i18n.changeLanguage(lng);
    // Persist server-side for signed-in users so the choice follows them
    // across devices AND so backend notification dispatch can render
    // title/body in this language. Fire-and-forget: i18next already
    // switched the UI; a failed PATCH just means the server keeps the
    // old preference (best-effort, no toast to avoid noise on a passive
    // toggle). Skip entirely when unauthenticated — no profile to write.
    if (isAuthenticated && lng !== current) {
      updateProfile.mutate({ locale: lng });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("languages.switch", { defaultValue: "Language" })}
        className="inline-flex items-center justify-center h-9 w-9 rounded-md text-text-muted hover:bg-surface-muted hover:text-primary cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Globe className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-44 rounded-lg bg-card shadow-editorial border border-border p-1.5"
      >
        {SUPPORTED_LOCALES.map((lng) => (
          <DropdownMenuItem
            key={lng}
            onClick={() => handleChange(lng)}
            className={`rounded-md px-3 py-2 gap-3 cursor-pointer ${
              current === lng
                ? "bg-primary-soft text-primary font-semibold"
                : "text-m3-on-surface hover:bg-primary-soft focus:bg-primary-soft"
            }`}
          >
            <span className="text-sm">
              {t(`languages.${lng}`, {
                defaultValue: lng === "en" ? "English" : "Tiếng Việt",
              })}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
