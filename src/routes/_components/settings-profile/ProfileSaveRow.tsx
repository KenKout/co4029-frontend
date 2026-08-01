import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function ProfileSaveRow({ isSaving }: { isSaving: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end pt-2">
      <Button type="submit" disabled={isSaving}>
        {isSaving ? (
          <span className="flex items-center gap-2">
            <svg
              className="size-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {t("settings_profile.saving")}
          </span>
        ) : (
          t("settings_profile.save")
        )}
      </Button>
    </div>
  );
}
