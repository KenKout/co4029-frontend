/**
 * Timing and amplitude constants for interview narration.
 *
 * Moved verbatim out of `use-interview-narration.ts` — every value and the
 * reasoning behind it is unchanged. Changing any number here changes when the
 * interviewer's voice starts relative to the question text, so treat them as
 * measured, not tunable.
 */

// Deepgram Aura synthesis of long utterances (e.g. the multi-sentence
// onboarding greeting) can take 12-13s server-side — measured 200-OK responses
// at latency_ms ~13000. A 6s client timeout gave up before that audio arrived
// and fell back to the browser voice, so long turns spoke in a DIFFERENT voice
// than short ones. Raise the cap above the observed worst case so every turn
// uses the same server (Deepgram) voice; short turns still return in ~2-4s.
export const SERVER_NARRATION_TIMEOUT_MS = 20_000;
export const AUDIO_READY_TIMEOUT_MS = 1_500;
export const AUDIO_OUTPUT_WARMUP_MS = 400;
// Keep the warm-up loop running well into the real audio so the physical
// output route can't re-idle and clip the first syllable during the handoff.
export const AUDIO_OUTPUT_HANDOFF_OVERLAP_MS = 320;
export const AUDIO_WARMUP_DURATION_MS = 500;
// 48 kHz so the alternating-sample keep-alive tone sits at 24 kHz (Nyquist),
// which is inaudible — letting us raise its amplitude enough to hold the
// output route open without the user ever hearing it.
export const AUDIO_WARMUP_SAMPLE_RATE = 48_000;
export const EMBEDDED_AUDIO_LEAD_IN_MS = 500;
export const AUDIO_SOURCE_SCHEDULE_AHEAD_MS = 30;
// Keep-alive amplitude for the near-silent warm-up tone and the embedded
// lead-in. Both signals alternate every sample (a Nyquist-frequency tone the
// speaker can't reproduce and the ear can't hear), so this can be far above
// the old ~-84 dBFS noise floor. At ~-56 dBFS it reliably defeats the
// auto-mute / squelch on power-managed laptop DACs and Bluetooth routes that
// treated the previous ±2/32768 signal as digital silence and let the output
// idle — which was clipping/attenuating the first syllable of each utterance.
export const AUDIO_KEEPALIVE_INT16 = 48;
export const AUDIO_LEAD_IN_AMPLITUDE = AUDIO_KEEPALIVE_INT16 / 32_768;
export const HAVE_FUTURE_DATA = 3;
