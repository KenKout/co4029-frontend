import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import { ChecklistRow } from "./checklist-row";
import type {
  ChecklistItemState,
  SetupActionHandler,
  SetupLanguage,
} from "./setup-stages";

export function LanguageRow({
  state,
  language,
  disabled,
  onLanguageChange,
  onAction,
}: {
  state: ChecklistItemState;
  language: SetupLanguage;
  disabled: boolean;
  onLanguageChange: (language: SetupLanguage) => void;
  onAction: SetupActionHandler;
}) {
  const { t } = useTranslation();
  return (
    <ChecklistRow
      state={state}
      icon={<Sparkles className="h-4 w-4" />}
      label={t("course_interview.setup.language")}
      value={
        state === "done"
          ? t(`course_interview.onboarding.languages.${language}`)
          : undefined
      }
    >
      {state === "active" && (
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t("course_interview.onboarding.language_label")}
        >
          {(["en", "vi"] as const).map((item) => (
            <Button
              key={item}
              type="button"
              variant={language === item ? "default" : "outline"}
              size="lg"
              disabled={disabled}
              aria-pressed={language === item}
              onClick={() => {
                onLanguageChange(item);
                onAction("confirm_language", { language: item });
              }}
              className="min-h-11 rounded-lg px-4"
            >
              {t(`course_interview.onboarding.languages.${item}`)}
            </Button>
          ))}
        </div>
      )}
    </ChecklistRow>
  );
}
