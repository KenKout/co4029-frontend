import { useState } from "react";

import { AudioRow } from "@/components/interview/setup-checklist/audio-row";
import { ChecklistHeader } from "@/components/interview/setup-checklist/checklist-header";
import {
  ReadinessActions,
  SkipSetupAction,
} from "@/components/interview/setup-checklist/footer-actions";
import { IdentityRow } from "@/components/interview/setup-checklist/identity-row";
import { LanguageRow } from "@/components/interview/setup-checklist/language-row";
import { itemState } from "@/components/interview/setup-checklist/setup-stages";
import type {
  SetupAction,
  SetupLanguage,
  SetupStage,
} from "@/components/interview/setup-checklist/setup-stages";

export type { SetupAction, SetupLanguage, SetupStage };

/**
 * Compact readiness checklist for interview setup (spec §3).
 *
 * Replaces the multi-message conversational onboarding with a single scannable
 * card: identity, microphone, audio test, language, and a Start action. Each
 * step resolves through quick-action buttons (no free typing required) and maps
 * onto the existing onboarding stage machine via `onAction`.
 */
export function SetupChecklist({
  stage,
  candidateName,
  language,
  micConnected = true,
  disabled = false,
  pending = false,
  onLanguageChange,
  onAction,
}: {
  stage: SetupStage;
  candidateName: string;
  language: SetupLanguage;
  /** Whether a capture device is available (drives the mic row copy). */
  micConnected?: boolean;
  disabled?: boolean;
  /** True while an onboarding request is in flight (drives the spinner). */
  pending?: boolean;
  onLanguageChange: (language: SetupLanguage) => void;
  onAction: (
    action: SetupAction,
    payload?: { language?: SetupLanguage; name?: string },
  ) => void;
}) {
  // The identity step is a single name field: it prefills the profile name so
  // the common case is a one-tap confirm, but the candidate can edit it to any
  // preferred name before sending. Submitting dispatches set_name directly
  // (the backend treats set_name as an advance — no reject step needed).
  const [nameDraft, setNameDraft] = useState(candidateName ?? "");

  return (
    <section
      aria-labelledby="setup-checklist-title"
      className="mx-auto mt-6 w-full max-w-[520px] rounded-2xl border border-border bg-white px-5 py-6 shadow-editorial motion-safe:animate-fade-in-up sm:mt-8 sm:px-7 sm:py-7"
    >
      <ChecklistHeader />

      <ol className="flex flex-col gap-2.5">
        <IdentityRow
          state={itemState("identity_check", stage)}
          candidateName={candidateName}
          nameDraft={nameDraft}
          onNameDraftChange={setNameDraft}
          disabled={disabled}
          onAction={onAction}
        />

        <AudioRow
          state={itemState("audio_check", stage)}
          micConnected={micConnected}
          disabled={disabled}
          onAction={onAction}
        />

        <LanguageRow
          state={itemState("language_check", stage)}
          language={language}
          disabled={disabled}
          onLanguageChange={onLanguageChange}
          onAction={onAction}
        />
      </ol>

      <ReadinessActions
        stage={stage}
        disabled={disabled}
        pending={pending}
        onAction={onAction}
      />

      <SkipSetupAction stage={stage} disabled={disabled} onAction={onAction} />
    </section>
  );
}
