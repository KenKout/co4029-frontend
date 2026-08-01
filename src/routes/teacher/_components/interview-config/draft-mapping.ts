/**
 * Mapping between the saved `InterviewConfigAuthoring` shape and the page's
 * editable `SettingsDraft`, in both directions.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). Pure functions only — no hooks, no rendering — so the page can
 * be a thin orchestrator and the draft⇄payload round-trip stays testable on its
 * own. `interview-config-published-freeze.test.tsx` and
 * `src/lib/interview/__tests__/supplementary-instructions.test.ts` are the
 * behavioural contract for the (de)serialization these functions perform.
 */

import type {
  InterviewConfigAuthoring,
  InterviewConfigUpdate,
  PersonaProfileRead,
} from "@/lib/api/types";
import {
  PERSONA_TRAIT_PRESETS,
  type PersonaKey,
} from "@/lib/interview/persona-traits";
import {
  parseSupplementaryInstructions,
  serializeSupplementaryInstructions,
} from "@/lib/interview/supplementary-instructions";
import {
  PERSONA_TRAIT_KEYS,
  integerOrNull,
  type InterviewerRole,
  type Persona,
  type PersonaProfileOverride,
  type SettingsDraft,
  type TtsVoice,
} from "@/lib/interview/config-draft";

export function draftFromConfig(
  config: InterviewConfigAuthoring,
): SettingsDraft {
  return {
    title: config.title ?? "",
    persona: (config.persona ?? "neutral") as Persona,
    // "" = deployment default voice; only meaningful for English sessions.
    tts_voice: config.tts_voice ?? "",
    // All interviews are hybrid (type-or-voice). The mode selector was removed;
    // any legacy text/voice config is normalized to hybrid on load.
    supported_modes: "hybrid",
    time_limit_minutes:
      config.time_limit_minutes == null
        ? ""
        : String(config.time_limit_minutes),
    max_attempts:
      config.max_attempts == null ? "" : String(config.max_attempts),
    cooldown_hours:
      config.cooldown_hours == null ? "" : String(config.cooldown_hours),
    min_outcomes_to_pass:
      config.min_outcomes_to_pass == null
        ? ""
        : String(config.min_outcomes_to_pass),
    lock_quiz_ef_until_pass: config.lock_quiz_ef_until_pass,
    practice_mode_enabled: config.practice_mode_enabled ?? false,
    ...(() => {
      const parsed = parseSupplementaryInstructions(
        config.supplementary_instructions,
      );
      return { notes: parsed.notes, rubric_criteria: parsed.criteria };
    })(),
    security_response_policy:
      config.security_response_policy ?? "warn_and_continue",
    security_max_consecutive_attempts: String(
      config.security_max_consecutive_attempts ?? 3,
    ),
    security_custom_refusal_en: config.security_custom_refusal_en ?? "",
    security_custom_refusal_vi: config.security_custom_refusal_vi ?? "",
    security_incident_summary_enabled:
      config.security_incident_summary_enabled ?? true,
    // Seed the override panel from whatever the backend resolved. When the
    // config has no stored overrides this equals the preset, so the sliders
    // simply show the preset values; a teacher only creates a real override by
    // moving one away from its preset (see the diff computed on save).
    persona_profile: personaOverrideFromResolved(
      config.persona_profile_resolved,
    ),
  };
}

// Extract just the editable trait dials from the resolved profile. Returns an
// empty object when nothing is resolvable, so the panel falls back to preset
// values via `effectivePersonaTraits`.
function personaOverrideFromResolved(
  resolved: PersonaProfileRead | null | undefined,
): PersonaProfileOverride {
  if (!resolved) return {};
  return {
    warmth: resolved.warmth,
    directness: resolved.directness,
    verbosity: resolved.verbosity,
    formality: resolved.formality,
    ack_frequency: resolved.ack_frequency,
    interviewer_role:
      (resolved as { interviewer_role?: InterviewerRole }).interviewer_role ??
      "generic_assistant",
  };
}

// The effective trait values shown on the sliders: the teacher's override if
// present, else the persona preset. Keeps the panel in sync when the persona
// dropdown changes and no explicit override exists for a trait yet.

// Build the persona_profile payload sent on save: only the traits the teacher
// actually moved AWAY from the preset become an override. When nothing differs,
// return null so the config falls back to the bare preset (no stored override).
export function personaOverridePayload(
  persona: Persona,
  override: PersonaProfileOverride,
): PersonaProfileOverride | null {
  const preset =
    PERSONA_TRAIT_PRESETS[persona as PersonaKey] ??
    PERSONA_TRAIT_PRESETS.neutral;
  const presetByKey: Record<(typeof PERSONA_TRAIT_KEYS)[number], number> = {
    warmth: preset.warmth,
    directness: preset.directness,
    verbosity: preset.verbosity,
    formality: preset.formality,
    ack_frequency: preset.ackFrequency,
  };
  const diff: PersonaProfileOverride = {};
  let hasOverride = false;
  for (const key of PERSONA_TRAIT_KEYS) {
    const v = override[key];
    if (typeof v === "number" && v !== presetByKey[key]) {
      diff[key] = v;
      hasOverride = true;
    }
  }
  // Identity has no preset to differ from, so it is carried whenever it is set
  // to something other than the default. Without this the role would be dropped
  // on any config whose tone dials all match the preset.
  if (
    override.interviewer_role &&
    override.interviewer_role !== "generic_assistant"
  ) {
    diff.interviewer_role = override.interviewer_role;
    hasOverride = true;
  }
  return hasOverride ? diff : null;
}

/**
 * The PATCH body for a settings save. Extracted verbatim from `saveSettings` so
 * the page keeps only the validate → mutate → toast flow: every conversion from
 * the string-based draft back to the API shape lives here.
 */
export function buildConfigUpdatePayload(
  draft: SettingsDraft,
): InterviewConfigUpdate {
  return {
    title: draft.title.trim(),
    persona: draft.persona,
    persona_profile: personaOverridePayload(
      draft.persona,
      draft.persona_profile,
    ),
    // Empty selection → null (deployment default voice).
    tts_voice: (draft.tts_voice || null) as TtsVoice | null,
    supported_modes: draft.supported_modes,
    time_limit_minutes: integerOrNull(draft.time_limit_minutes),
    max_attempts: integerOrNull(draft.max_attempts),
    cooldown_hours: integerOrNull(draft.cooldown_hours),
    min_outcomes_to_pass: integerOrNull(draft.min_outcomes_to_pass),
    lock_quiz_ef_until_pass: draft.lock_quiz_ef_until_pass,
    practice_mode_enabled: draft.practice_mode_enabled,
    supplementary_instructions: serializeSupplementaryInstructions({
      notes: draft.notes,
      criteria: draft.rubric_criteria,
    }),
    security_response_policy: draft.security_response_policy,
    security_max_consecutive_attempts:
      integerOrNull(draft.security_max_consecutive_attempts) ?? 3,
    security_custom_refusal_en: draft.security_custom_refusal_en.trim() || null,
    security_custom_refusal_vi: draft.security_custom_refusal_vi.trim() || null,
    security_incident_summary_enabled: draft.security_incident_summary_enabled,
  };
}
