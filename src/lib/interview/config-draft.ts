/**
 * Types and pure helpers for the interview-config settings draft.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 1 of that file's
 * decomposition). Nothing here renders or uses a hook, so the settings-draft
 * shape and the persona-override diffing are testable and importable without
 * pulling in the 3000-line page.
 *
 * The draft is a STRING-BASED mirror of the API shape on purpose: number inputs
 * bind to strings so a half-typed value ("" or "1") does not fight the control,
 * and `integerOrNull` converts back at save time.
 */

import type {
  InterviewConfigUpdate,
  InterviewGenerationRequest,
} from "@/lib/api/types";
import type { RubricCriterion } from "@/lib/interview/supplementary-instructions";

export type SupportedMode = NonNullable<
  InterviewConfigUpdate["supported_modes"]
>;
export type Persona = NonNullable<InterviewConfigUpdate["persona"]>;
export type TtsVoice = NonNullable<InterviewConfigUpdate["tts_voice"]>;
export type GenerationMode = InterviewGenerationRequest["mode"];
export type SecurityResponsePolicy =
  | "continue_and_log"
  | "warn_and_continue"
  | "end_and_flag";

export type TabId =
  | "settings"
  | "generate"
  | "questions"
  | "adaptive-readiness";

/** Professional identity presets. MUST stay in sync with the backend
 *  `InterviewerRoleLiteral` (schemas/authoring.py) and the preset table in
 *  orchestrator/interviewer_identity.py. */
export type InterviewerRole =
  | "generic_assistant"
  | "backend_tech_lead"
  | "staff_engineer"
  | "eng_manager"
  | "hr_screener";

export const INTERVIEWER_ROLE_KEYS: InterviewerRole[] = [
  "generic_assistant",
  "backend_tech_lead",
  "staff_engineer",
  "eng_manager",
  "hr_screener",
];

export const PERSONA_TRAIT_KEYS = [
  "warmth",
  "directness",
  "verbosity",
  "formality",
  "ack_frequency",
] as const;

export const PERSONA_KEYS: Persona[] = ["strict", "neutral", "supportive"];

// Deepgram Aura-2 English voices. MUST stay in sync with the backend allow-list
// (services.narration.ALLOWED_TTS_VOICES / schemas.authoring.TtsVoiceLiteral).
// Empty value ("") = deployment default (settings.deepgram_tts_model_en).
// English-only: Vietnamese sessions have no server TTS, so this is ignored there.
export const VOICE_KEYS: TtsVoice[] = [
  "aura-2-thalia-en",
  "aura-2-andromeda-en",
  "aura-2-helena-en",
  "aura-2-apollo-en",
  "aura-2-arcas-en",
  "aura-2-aries-en",
  "aura-2-asteria-en",
  "aura-2-athena-en",
  "aura-2-hera-en",
  "aura-2-hyperion-en",
  "aura-2-luna-en",
  "aura-2-orion-en",
  "aura-2-orpheus-en",
  "aura-2-ophelia-en",
  "aura-2-zeus-en",
  "aura-2-vesta-en",
];

/** Local editable shape for the per-trait override panel. All optional so a
 *  teacher can nudge one dial; absent keys fall back to the persona preset. */
export interface PersonaProfileOverride {
  warmth?: number;
  directness?: number;
  verbosity?: number;
  formality?: number;
  ack_frequency?: number;
  // Who the interviewer presents as. Not a 0-4 dial and not diffed against the
  // persona preset — identity is its own axis, so it is sent whenever the
  // teacher picks anything other than the generic assistant.
  interviewer_role?: InterviewerRole;
}

export interface GenerationFormState {
  mode: GenerationMode;
  question_count: number;
  focus_topics: string;
  avoid_topics: string;
  // Modules the generation should draw from. Empty = the interview's own
  // module (backend default). Multi-select lets a teacher scope one interview
  // across several modules.
  source_module_ids: string[];
  // Interview rubric-outcome ids to target. Empty = every outcome (backend
  // default). Lets a teacher focus a run on specific learning outcomes.
  target_outcome_ids: string[];
}

export interface SettingsDraft {
  title: string;
  persona: Persona;
  tts_voice: string;
  supported_modes: SupportedMode;
  time_limit_minutes: string;
  max_attempts: string;
  cooldown_hours: string;
  min_outcomes_to_pass: string;
  lock_quiz_ef_until_pass: boolean;
  practice_mode_enabled: boolean;
  // The single `supplementary_instructions` column is split for editing into
  // free prose (`notes`, fed to the generation prompt) and the structured
  // scoring rubric (`rubric_criteria`). They are re-joined on save by
  // `serializeSupplementaryInstructions`.
  notes: string;
  rubric_criteria: RubricCriterion[];
  security_response_policy: SecurityResponsePolicy;
  security_max_consecutive_attempts: string;
  security_custom_refusal_en: string;
  security_custom_refusal_vi: string;
  security_incident_summary_enabled: boolean;
  // Optional per-trait persona overrides (Phase 3). Empty object = no override
  // (use the persona preset as-is). Each trait 0-4; opening_style optional.
  persona_profile: PersonaProfileOverride;
}

/** "" and non-numeric input mean "unset", not zero. */
export function integerOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
