/**
 * Interviewer speaking-speed constant.
 *
 * `1.0` is the providers' natural rate. Values above 1 speed the interviewer
 * up (1.1 ≈ 10% faster), values below 1 slow it down. Applied client-side —
 * see the playback paths in `use-interview-narration/`, the browser-voice
 * rate in `use-speech-synthesis`, and the room-audio hook in
 * `interview-room-provider` — because no single server-side knob exists:
 * Deepgram Aura (English server TTS, native-agent EN voice) has no speed
 * parameter, and the browser playback layer covers every voice with one
 * number.
 *
 * `preservesPitch = true` (set wherever `playbackRate` is applied) keeps the
 * tone natural instead of chipmunking; narration-duration estimates divide by
 * the same factor so the typewriter pacing tracks what is actually audible.
 */

// Temporary tuning (teacher request): speed the interviewer up across both
// languages. Set this back to 1.0 to restore the providers' natural rate.
export const INTERVIEWER_PLAYBACK_RATE = 1.5;

/**
 * Effective playback rate for a narration/agent voice in `lang`.
 * Reserved so a language-specific factor can diverge from the global
 * constant without touching the call sites again.
 */
export function playbackRateForLang(_lang: string): number {
  return INTERVIEWER_PLAYBACK_RATE;
}
