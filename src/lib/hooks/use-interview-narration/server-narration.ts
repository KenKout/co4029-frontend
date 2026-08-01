/**
 * Server narration request and playout routing for one turn.
 *
 * Moved verbatim out of `use-interview-narration.ts`. The shape is unchanged:
 * race the request against `SERVER_NARRATION_TIMEOUT_MS`, try Web Audio, fall
 * through to buffered `HTMLAudio`, and recover to the browser voice on timeout,
 * a non-API error, or a 5xx. The timeout handle is always cleared in `finally`.
 */

import { ApiError, apiPostBlob } from "@/lib/api/client";
import { NarrationTimeoutError } from "@/lib/hooks/use-interview-narration/audio-support";
import { SERVER_NARRATION_TIMEOUT_MS } from "@/lib/hooks/use-interview-narration/constants";
import { playViaAudioElement } from "@/lib/hooks/use-interview-narration/element-playback";
import type { NarrationPlaybackContext } from "@/lib/hooks/use-interview-narration/playback-context";
import { playViaWebAudio } from "@/lib/hooks/use-interview-narration/web-audio-playback";

export interface ServerNarrationContext extends NarrationPlaybackContext {
  clean: string;
  sessionId: string | null;
  serverNarrationEnabled: boolean;
}

function handleNarrationFailure(
  ctx: ServerNarrationContext,
  error: unknown,
): void {
  if (!ctx.isCurrent()) return;
  if (
    error instanceof NarrationTimeoutError ||
    !(error instanceof ApiError) ||
    error.status >= 500
  ) {
    ctx.browserFallback();
  } else {
    // Authentication/validation failures should stay silent.

    console.warn("narration request failed", error.status);
    ctx.stopAudioWarmup();
    ctx.deferred.resolveStarted();
    ctx.deferred.resolveFinished();
    ctx.deferred.resolveDuration(null);
  }
}

export async function runServerNarration(
  ctx: ServerNarrationContext,
): Promise<void> {
  if (!ctx.sessionId || !ctx.serverNarrationEnabled) {
    // No session yet, or server TTS is known-unavailable for this
    // session's language (e.g. Vietnamese) — skip the server call that
    // would only 503, and narrate with the browser voice directly.
    ctx.browserFallback();
    return;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const blob = await Promise.race([
      apiPostBlob(`/interview-sessions/${ctx.sessionId}/narration`, {
        text: ctx.clean,
      }),
      new Promise<Blob>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new NarrationTimeoutError()),
          SERVER_NARRATION_TIMEOUT_MS,
        );
      }),
    ]);
    if (!ctx.isCurrent()) return;

    if (await playViaWebAudio(ctx, blob)) return;
    await playViaAudioElement(ctx, blob);
  } catch (error) {
    handleNarrationFailure(ctx, error);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
