import { Check, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ChecklistRow } from "./checklist-row";
import type { ChecklistItemState, SetupActionHandler } from "./setup-stages";

export function IdentityRow({
  state,
  candidateName,
  nameDraft,
  onNameDraftChange,
  disabled,
  onAction,
}: {
  state: ChecklistItemState;
  candidateName: string;
  nameDraft: string;
  onNameDraftChange: (value: string) => void;
  disabled: boolean;
  onAction: SetupActionHandler;
}) {
  const { t } = useTranslation();
  return (
    <ChecklistRow
      state={state}
      icon={<UserRound className="h-4 w-4" />}
      label={t("course_interview.setup.identity")}
      value={candidateName}
    >
      {state === "active" && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const name = nameDraft.trim();
            if (!name) return;
            onAction("set_name", { name });
          }}
        >
          <label
            htmlFor="setup-preferred-name"
            className="text-xs font-medium text-text-muted"
          >
            {t("course_interview.onboarding.ask_name")}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="setup-preferred-name"
              value={nameDraft}
              onChange={(event) => onNameDraftChange(event.target.value)}
              maxLength={60}
              autoComplete="off"
              placeholder={t("course_interview.onboarding.name_placeholder")}
              className="h-11 max-w-[220px] flex-1"
              aria-label={t("course_interview.onboarding.ask_name")}
            />
            <Button
              type="submit"
              size="lg"
              disabled={disabled || nameDraft.trim().length === 0}
              className="min-h-11 rounded-lg"
            >
              <Check className="h-4 w-4" />
              {t("course_interview.onboarding.save_name")}
            </Button>
          </div>
        </form>
      )}
    </ChecklistRow>
  );
}
