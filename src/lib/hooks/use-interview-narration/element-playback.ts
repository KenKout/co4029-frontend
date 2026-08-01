/**
 * Buffered `HTMLAudio` playout of server narration — the compatibility path for
 * browsers that cannot decode an otherwise playable MP3 through Web Audio.
 *
 * Moved verbatim out of `use-interview-narration.ts`: the object URL is
 * registered before the element exists so `cancel()` can always revoke it, the
 * element is fully buffered before playing, and `currentTime` is reset to 0 so
 * the turn always starts at the beginning of the audio.
 */

import { waitForAudioReady } from "@/lib/hooks/use-interview-narration/audio-support";
import type { NarrationPlaybackContext } from "@/lib/hooks/use-interview-narration/playback-context";

export async function playViaAudioElement(
  ctx: NarrationPlaybackContext,
  blob: Blob,
): Promise<void> {
  const url = URL.createObjectURL(blob);
  ctx.objectUrlRef.current = url;
  const audio = new Audio(url);
  audio.preload = "auto";
  ctx.audioRef.current = audio;
  let serverAudioFailed = false;
  audio.onended = () => {
    if (!ctx.isCurrent()) return;
    ctx.releaseUrl();
    ctx.deferred.resolveFinished();
  };
  audio.onerror = () => {
    if (!ctx.isCurrent()) return;
    serverAudioFailed = true;
    ctx.releaseUrl();
    ctx.browserFallback();
  };
  await waitForAudioReady(audio);
  if (!ctx.isCurrent() || serverAudioFailed) return;
  ctx.deferred.resolveDuration(
    Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration * 1_000
      : null,
  );
  await ctx.warmup.ensureAudioWarmup();
  if (!ctx.isCurrent() || serverAudioFailed) return;
  audio.currentTime = 0;
  await audio.play();
  ctx.deferred.resolveStarted();
  ctx.warmup.finishAudioWarmupAfterHandoff();
}
