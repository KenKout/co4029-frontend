/**
 * Card 1 of the Settings tab — Basics: identity + interviewer style grouped
 * together, with persona/voice on one row (FormBold-style two-up layout).
 *
 * Split out of `settings-form.tsx` (step 8 of the interview-config
 * decomposition).
 */

import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  INTERVIEWER_ROLE_KEYS,
  PERSONA_KEYS,
  VOICE_KEYS,
  preferredQuestionTypeForRole,
  type InterviewerRole,
  type Persona,
} from "@/lib/interview/config-draft";
import type { InterviewQuestionAuthoring } from "@/lib/api/types";
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
  questions = [],
}: Omit<SettingsFieldsetProps, "frozenReason"> & {
  /** Questions in the config's bank — coverage warning counts approved ones. */
  questions?: InterviewQuestionAuthoring[];
}) {
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
            HOW they sound, this is WHO they are. Selecting a role also
            narrows the question TYPE the agent asks (see the warning below if
            the bank lacks that type). */}
        <Field
          label={t("teacher_interview_config.fields.interviewer_role")}
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
            options={INTERVIEWER_ROLE_KEYS.map((r) => {
              const type = preferredQuestionTypeForRole(r);
              const roleLabel = t(
                `teacher_interview_config.interviewer_role.${r}`,
              );
              const typeLabel = type
                ? t(`teacher_interview_config.question_type.${type}`)
                : null;
              return {
                value: r,
                // "Backend tech lead - Technical": the role label carries the
                // question type it will ask, so the choice reads as an
                // assessment decision, not just a voice.
                label: typeLabel ? `${roleLabel} - ${typeLabel}` : roleLabel,
              };
            })}
          />
          {(() => {
            const role =
              draft.persona_profile.interviewer_role ?? "generic_assistant";
            const type = preferredQuestionTypeForRole(role);
            // Only APPROVED questions can actually be asked (a draft question
            // is invisible to the run), so coverage counts approved alone.
            const missing =
              type != null &&
              !questions.some(
                (q) =>
                  q.question_type === type &&
                  q.review_status === "approved",
              );
            if (!missing) return null;
            const typeLabel = t(
              `teacher_interview_config.question_type.${type}`,
            );
            return (
              <p
                role="alert"
                className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                <TriangleAlert
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  {t(
                    "teacher_interview_config.warnings.no_role_type_questions",
                    { type: typeLabel },
                  )}
                </span>
              </p>
            );
          })()}
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
