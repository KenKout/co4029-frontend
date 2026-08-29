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
    max_follow_ups_per_question: String(config.max_follow_ups_per_question ?? 2),
    max_hints_per_question: String(config.max_hints_per_question ?? 3),
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
      config.persona,
      config.persona_profile_resolved,
    ),
  };
}

// Extract just the editable trait dials from the resolved profile. Returns an
// empty object when nothing is resolvable, so the panel falls back to preset
// values via `effectivePersonaTraits`.
function personaOverrideFromResolved(
  persona: string | null | undefined,
  resolved: PersonaProfileRead | null | undefined,
): PersonaProfileOverride {
  if (!resolved) return {};
  const preset =
    PERSONA_TRAIT_PRESETS[persona as PersonaKey] ?? PERSONA_TRAIT_PRESETS.neutral;
  const override: PersonaProfileOverride = {};
  const values: Record<(typeof PERSONA_TRAIT_KEYS)[number], number | undefined> = {
    warmth: resolved.warmth,
    directness: resolved.directness,
    verbosity: resolved.verbosity,
    formality: resolved.formality,
    ack_frequency: resolved.ack_frequency,
  };
  const presetValues: Record<(typeof PERSONA_TRAIT_KEYS)[number], number> = {
    warmth: preset.warmth,
    directness: preset.directness,
    verbosity: preset.verbosity,
    formality: preset.formality,
    ack_frequency: preset.ackFrequency,
  };
  for (const key of PERSONA_TRAIT_KEYS) {
    if (values[key] !== undefined && values[key] !== presetValues[key]) {
      override[key] = values[key];
    }
  }
  const role = (resolved as { interviewer_role?: InterviewerRole }).interviewer_role;
  if (role && role !== "generic_assistant") override.interviewer_role = role;
  return override;
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
 *
 * When a `baseline` draft (the saved config, serialized the same way) is given,
 * only fields that actually differ from it are included. This is what lets a
 * teacher retitle a PUBLISHED interview: the backend freeze
 * (`assert_config_settings_editable`) whitelists `title`, but it sees every
 * explicitly-sent field as "changed" — so echoing the whole form back would 409
 * on the frozen settings even though none of them moved. Diffing turns a
 * title-only edit into a title-only PATCH. With no baseline (or a draft that
 * differs everywhere), behaviour is unchanged from before.
 */
export function buildConfigUpdatePayload(
  draft: SettingsDraft,
  baseline?: SettingsDraft,
): InterviewConfigUpdate {
  const next = buildFullConfigUpdatePayload(draft);
  if (!baseline) return next;
  const prev = buildFullConfigUpdatePayload(baseline);
  const changed: Record<string, unknown> = {};
  for (const key of Object.keys(next)) {
    // Serialize-compare: number-vs-string coercions on the wire (e.g. blank
    // minutes → null) must not mark an untouched field as changed.
    if (JSON.stringify(next[key as keyof InterviewConfigUpdate]) !==
        JSON.stringify(prev[key as keyof InterviewConfigUpdate])) {
      changed[key] = next[key as keyof InterviewConfigUpdate];
    }
  }
  return changed as unknown as InterviewConfigUpdate;
}

/**
 * True when saving the draft would actually change the stored config.
 *
 * Compares the PATCH payloads instead of the raw draft strings: several draft
 * shapes normalize to the same wire value (the title is trimmed, a blank
 * numeric knob falls back to its shipped default, persona traits equal to the
 * preset are dropped from the override). A raw string diff over-reports dirty
 * for those — an edit that maps to the stored value would open the
 * unsaved-changes dialog and then "save" as a silent no-op PATCH (feedback:
 * config 8d34193b, clear fields at default → PATCH {} → 200 with no write).
 * Basing dirty on the payload keeps the dialog, the footer label and any
 * "saved" claim honest.
 */
export function isDraftDirty(
  draft: SettingsDraft,
  config: InterviewConfigAuthoring,
): boolean {
  return (
    Object.keys(buildConfigUpdatePayload(draft, draftFromConfig(config)))
      .length > 0
  );
}

/** Preserve locally edited fields while accepting unrelated server updates. */
export function reconcileDraftWithConfig(
  current: SettingsDraft,
  previousSaved: InterviewConfigAuthoring,
  incoming: InterviewConfigAuthoring,
): SettingsDraft {
  const incomingDraft = draftFromConfig(incoming);
  const previousDraft = draftFromConfig(previousSaved);
  const changed = buildConfigUpdatePayload(current, previousDraft);
  const next = { ...incomingDraft };
  for (const key of Object.keys(changed)) {
    if (key === "supplementary_instructions") {
      next.notes = current.notes;
      next.rubric_criteria = current.rubric_criteria;
    } else if (key in next) {
      (next as Record<string, unknown>)[key] =
        (current as unknown as Record<string, unknown>)[key];
    }
  }
  return next;
}

function buildFullConfigUpdatePayload(
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
    time_limit_minutes: integerOrNull(draft.time_limit_minutes),
    max_attempts: integerOrNull(draft.max_attempts),
    cooldown_hours: integerOrNull(draft.cooldown_hours),
    min_outcomes_to_pass: integerOrNull(draft.min_outcomes_to_pass),
    // NOT NULL columns: an empty field falls back to the shipped default
    // rather than null, which the DB would reject.
    max_follow_ups_per_question:
      integerOrNull(draft.max_follow_ups_per_question) ?? 2,
    max_hints_per_question: integerOrNull(draft.max_hints_per_question) ?? 3,
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
