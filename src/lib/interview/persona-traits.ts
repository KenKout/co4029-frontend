/**
 * Persona trait model + derivations — the single source of truth the frontend
 * uses for persona-driven voice behaviour (Phase 6).
 *
 * Before this module the persona affected three scattered lookup tables keyed by
 * the persona NAME (``PERSONA_PROSODY`` in use-speech-synthesis, and a
 * ``persona === "strict" ? …`` narrowing in course-interview). Adding a fourth
 * persona, or honouring a teacher's per-trait override, meant editing every one.
 *
 * Now everything is DERIVED from the same 0-4 trait dials the backend already
 * resolves (see orchestrator/persona.py). A new persona or a teacher override is
 * just a different set of numbers — no table to duplicate. The mapping mirrors
 * the backend intent: verbosity → speaking rate/WPM, warmth → pitch + voice
 * gender hint. TONE ONLY: this never touches scoring or question selection.
 */
import type { PersonaProfileRead } from "@/lib/api/types";

/** The three built-in persona labels; a config's ``persona`` column value. */
export type PersonaKey = "strict" | "neutral" | "supportive";

/** Resolved persona traits (0-4 dials) — the shape the backend returns too. */
export interface PersonaTraits {
  key: string;
  warmth: number;
  directness: number;
  verbosity: number;
  formality: number;
  ackFrequency: number;
  openingStyle: "brief" | "standard" | "comfort";
}

const TRAIT_MIN = 0;
const TRAIT_MAX = 4;

function clampTrait(value: number): number {
  if (!Number.isFinite(value)) return 2;
  return Math.max(TRAIT_MIN, Math.min(TRAIT_MAX, Math.round(value)));
}

/**
 * The three built-in presets — kept in lockstep with the backend PRESETS
 * (orchestrator/persona.py). These are the fallback when a config carries no
 * resolved profile (older sessions, or the field not yet loaded).
 */
export const PERSONA_TRAIT_PRESETS: Record<PersonaKey, PersonaTraits> = {
  strict: {
    key: "strict",
    warmth: 0,
    directness: 4,
    verbosity: 1,
    formality: 4,
    ackFrequency: 1,
    openingStyle: "brief",
  },
  neutral: {
    key: "neutral",
    warmth: 2,
    directness: 2,
    verbosity: 2,
    formality: 3,
    ackFrequency: 2,
    openingStyle: "standard",
  },
  supportive: {
    key: "supportive",
    warmth: 4,
    directness: 1,
    verbosity: 3,
    formality: 2,
    ackFrequency: 3,
    openingStyle: "comfort",
  },
};

const NEUTRAL = PERSONA_TRAIT_PRESETS.neutral;

function presetFor(persona: string | null | undefined): PersonaTraits {
  if (
    persona === "strict" ||
    persona === "supportive" ||
    persona === "neutral"
  ) {
    return PERSONA_TRAIT_PRESETS[persona];
  }
  return NEUTRAL;
}

/**
 * Resolve the effective traits for a config. Prefers the backend-resolved
 * ``persona_profile_resolved`` (preset already merged with teacher overrides in
 * Phase 3) so a tuned tone reaches the browser voice too; otherwise falls back
 * to the preset for the ``persona`` label, then neutral. Every trait is clamped
 * so a malformed payload can never produce an out-of-range dial.
 */
export function resolvePersonaTraits(
  persona: string | null | undefined,
  resolved?: PersonaProfileRead | null,
): PersonaTraits {
  const base = presetFor(persona);
  if (!resolved) return base;
  return {
    key:
      typeof resolved.key === "string" && resolved.key
        ? resolved.key
        : base.key,
    warmth: clampTrait(resolved.warmth ?? base.warmth),
    directness: clampTrait(resolved.directness ?? base.directness),
    verbosity: clampTrait(resolved.verbosity ?? base.verbosity),
    formality: clampTrait(resolved.formality ?? base.formality),
    ackFrequency: clampTrait(resolved.ack_frequency ?? base.ackFrequency),
    openingStyle: resolved.opening_style ?? base.openingStyle,
  };
}

export interface PersonaProsody {
  rate: number;
  pitch: number;
  /** Lowercase substrings preferred when matching an installed browser voice. */
  voiceHints: string[];
}

// Voice-name hints by warmth band. High warmth prefers a warmer (conventionally
// female) installed voice, low warmth a firmer (male) one; mid expresses no
// preference. Best-effort — the browser may have neither.
const WARM_VOICE_HINTS = ["samantha", "female", "google uk english female"];
const FIRM_VOICE_HINTS = ["daniel", "male", "google uk english male"];

/**
 * Derive browser-TTS prosody from traits (was the ``PERSONA_PROSODY`` table).
 *   - pitch rises with warmth (cold/detached → warm/encouraging).
 *   - rate eases as directness rises (a blunt/strict tone reads slower and more
 *     deliberate; a gentler tone is a touch quicker).
 * Rounded to the ~0.01 steps browser TTS renders distinctly. The three presets
 * land close to the previous hand-tuned values, so existing personas sound the
 * same while a custom trait set now also gets a sensible voice.
 */
export function prosodyFromTraits(traits: PersonaTraits): PersonaProsody {
  const warmth = clampTrait(traits.warmth);
  const directness = clampTrait(traits.directness);
  // warmth 0→0.85, 2→0.99, 4→1.13 (matches the old strict/neutral/supportive).
  const pitch = Math.round((0.85 + warmth * 0.07) * 100) / 100;
  // directness 4→0.90, 2→0.98, 1→1.02 (strict slower, supportive quicker).
  const rate = Math.round((1.06 - directness * 0.04) * 100) / 100;
  const voiceHints =
    warmth >= 3 ? WARM_VOICE_HINTS : warmth <= 1 ? FIRM_VOICE_HINTS : [];
  return { rate, pitch, voiceHints };
}

/**
 * Derive the spoken words-per-minute estimate from verbosity (was the
 * ``PERSONA_WORDS_PER_MINUTE`` table). A more verbose persona speaks a little
 * faster; a terse/strict one is more measured. Preset landings: strict
 * (verbosity 1) ≈ 137, neutral (2) ≈ 150, supportive (3) ≈ 163.
 */
export function wordsPerMinuteFromTraits(traits: PersonaTraits): number {
  const verbosity = clampTrait(traits.verbosity);
  return 124 + verbosity * 13;
}
