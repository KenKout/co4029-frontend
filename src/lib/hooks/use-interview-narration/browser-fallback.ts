/**
 * Browser-voice narration path: used when there is no session, when server TTS
 * is known-unavailable for the session language, and as the recovery path for
 * every server/decode/playback failure.
 *
 * Moved verbatim out of `use-interview-narration.ts`. The once-only guard, the
 * warm-up await, the missing-`onstart` backstop in `finally`, and the staleness
 * checks are unchanged.
 */

import type { PersonaTraits } from "@/lib/interview/persona-traits";
import type {
  SpeakOptions,
  SpeechPersona,
} from "@/lib/hooks/use-speech-synthesis";
import { estimateSpeechDurationMs } from "@/lib/hooks/use-interview-narration/audio-support";
import type { NarrationDeferred } from "@/lib/hooks/use-interview-narration/presentation";
import type { WarmupWindow } from "@/lib/hooks/use-interview-narration/warmup-window";

export interface BrowserFallbackContext {
  clean: string;
  lang: string;
  persona: SpeechPersona;
  traits: PersonaTraits;
  browserSpeak: (text: string, options?: SpeakOptions) => Promise<void>;
  deferred: NarrationDeferred;
  warmup: WarmupWindow;
  isCurrent: () => boolean;
  stopAudioWarmup: () => void;
}

export function createBrowserFallback(ctx: BrowserFallbackContext): () => void {
  let fallbackStarted = false;
  return () => {
    if (fallbackStarted) return;
    fallbackStarted = true;
    ctx.deferred.resolveDuration(
      estimateSpeechDurationMs(ctx.clean, ctx.traits, ctx.lang),
    );
    void (async () => {
      await ctx.warmup.ensureAudioWarmup();
      if (!ctx.isCurrent()) return;
      let browserSpeechStarted = false;
      const handleBrowserSpeechStart = () => {
        if (browserSpeechStarted || !ctx.isCurrent()) return;
        browserSpeechStarted = true;
        ctx.deferred.resolveStarted();
        ctx.warmup.finishAudioWarmupAfterHandoff();
      };
      try {
        const speech = ctx.browserSpeak(ctx.clean, {
          lang: ctx.lang,
          persona: ctx.persona,
          traits: ctx.traits,
          onStart: handleBrowserSpeechStart,
        });
        await Promise.resolve(speech);
      } catch {
        // Browser speech is best-effort.
      } finally {
        // Some older engines omit onstart; never leave presentation stuck.
        handleBrowserSpeechStart();
        if (ctx.isCurrent()) ctx.stopAudioWarmup();
        ctx.deferred.resolveFinished();
      }
    })();
  };
}
