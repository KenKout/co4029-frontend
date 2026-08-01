/**
 * Card 1 of the Settings tab — Basics: identity + interviewer style grouped
 * together, with persona/voice on one row (FormBold-style two-up layout).
 *
 * Split out of `settings-form.tsx` (step 8 of the interview-config
 * decomposition).
 */

import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  INTERVIEWER_ROLE_KEYS,
  PERSONA_KEYS,
  VOICE_KEYS,
  type InterviewerRole,
  type Persona,
} from "@/lib/interview/config-draft";
import {
  Field,
  SettingsCard,
} from "@/routes/teacher/_components/interview-config/form-primitives";
import { PersonaTraitsPanel } from "@/routes/teacher/_components/interview-config/persona-traits-panel";
import { VoicePersonaGuideSheet } from "@/routes/teacher/_components/interview-config/rubric-and-guide";
import type { SettingsFieldsetProps } from "@/routes/teacher/_components/interview-config/settings-fieldset";

export function SettingsBasicsCard({
  draft,
  update,
  lock,
  status,
}: Omit<SettingsFieldsetProps, "frozenReason">) {
  const { t } = useTranslation();
  return (
    <SettingsCard
      stagger={0}
      title={t("teacher_interview_config.sections.general.title")}
      description={t("teacher_interview_config.sections.general.description")}
    >
      <Field label={t("teacher_interview_config.fields.title")}>
        <Input
          value={draft.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder={t("teacher_interview_config.fields.title_placeholder")}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label={t("teacher_interview_config.fields.persona")}
          {...lock("persona")}
        >
          <Select<Persona>
            value={draft.persona}
            onValueChange={(next) => update("persona", next)}
            options={PERSONA_KEYS.map((p) => ({
              value: p,
              label: t(`teacher_interview_config.persona.${p}`),
            }))}
          />
          <VoicePersonaGuideSheet focus="persona" />
        </Field>
        {/* Who the interviewer presents as. Orthogonal to persona: persona is
            HOW they sound, this is WHO they are. Like persona it shapes
            language only — never difficulty, question choice, or scoring. */}
        <Field
          label={t("teacher_interview_config.fields.interviewer_role")}
          hint={t("teacher_interview_config.fields.interviewer_role_hint")}
          {...lock("persona_profile")}
        >
          <Select<InterviewerRole>
            value={
              draft.persona_profile.interviewer_role ?? "generic_assistant"
            }
            onValueChange={(next) =>
              update("persona_profile", {
                ...draft.persona_profile,
                interviewer_role: next,
              })
            }
            options={INTERVIEWER_ROLE_KEYS.map((r) => ({
              value: r,
              label: t(`teacher_interview_config.interviewer_role.${r}`),
            }))}
          />
        </Field>
        <Field
          label={t("teacher_interview_config.fields.voice_label")}
          hint={t("teacher_interview_config.fields.voice_hint")}
          {...lock("tts_voice")}
        >
          <Select
            value={draft.tts_voice}
            onValueChange={(next) => update("tts_voice", next)}
            options={[
              {
                value: "",
                label: t("teacher_interview_config.fields.voice_default"),
              },
              ...VOICE_KEYS.map((v) => ({
                value: v as string,
                label: t(`teacher_interview_config.voice.${v}`),
              })),
            ]}
          />
          <VoicePersonaGuideSheet focus="voice" />
        </Field>
      </div>

      <PersonaTraitsPanel draft={draft} update={update} status={status} />
    </SettingsCard>
  );
}
