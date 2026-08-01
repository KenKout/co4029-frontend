/**
 * Web Audio playout of server narration, with an embedded near-silent lead-in
 * spliced onto the front of the decoded buffer so the output route is already
 * live when the first spoken sample arrives.
 *
 * Moved verbatim out of `use-interview-narration.ts`. Returns true when this
 * path owns the turn (played, or aborted because a newer turn superseded it) and
 * false when the caller should fall back to buffered `HTMLAudio` — which is
 * exactly what the original's inner `try`/`catch` did by falling through.
 */

import {
  audioContextConstructor,
  type ActiveAudioGraph,
} from "@/lib/hooks/use-interview-narration/audio-support";
import {
  AUDIO_LEAD_IN_AMPLITUDE,
  AUDIO_SOURCE_SCHEDULE_AHEAD_MS,
  EMBEDDED_AUDIO_LEAD_IN_MS,
} from "@/lib/hooks/use-interview-narration/constants";
import type { NarrationPlaybackContext } from "@/lib/hooks/use-interview-narration/playback-context";

/** Prepend the keep-alive lead-in frames to every channel of the decoded audio. */
function buildProtectedBuffer(
  context: AudioContext,
  decodedAudio: AudioBuffer,
): AudioBuffer {
  const leadInFrames = Math.ceil(
    (decodedAudio.sampleRate * EMBEDDED_AUDIO_LEAD_IN_MS) / 1_000,
  );
  const protectedAudio = context.createBuffer(
    decodedAudio.numberOfChannels,
    leadInFrames + decodedAudio.length,
    decodedAudio.sampleRate,
  );
  for (let channel = 0; channel < decodedAudio.numberOfChannels; channel += 1) {
    const destination = protectedAudio.getChannelData(channel);
    for (let frame = 0; frame < leadInFrames; frame += 1) {
      // Near-silence keeps the physical output route active without
      // adding a spoken word or changing the approved utterance.
      destination[frame] =
        frame % 2 === 0 ? AUDIO_LEAD_IN_AMPLITUDE : -AUDIO_LEAD_IN_AMPLITUDE;
    }
    destination.set(decodedAudio.getChannelData(channel), leadInFrames);
  }
  return protectedAudio;
}

function attachEndedHandler(
  ctx: NarrationPlaybackContext,
  graph: ActiveAudioGraph,
): void {
  const { context, source } = graph;
  source.onended = () => {
    if (ctx.audioGraphRef.current?.source === source) {
      ctx.audioGraphRef.current = null;
    }
    void context.close().catch(() => undefined);
    if (!ctx.isCurrent()) return;
    ctx.stopAudioWarmup();
    ctx.deferred.resolveStarted();
    ctx.deferred.resolveFinished();
  };
}

export async function playViaWebAudio(
  ctx: NarrationPlaybackContext,
  blob: Blob,
): Promise<boolean> {
  const AudioContextClass = audioContextConstructor();
  if (!AudioContextClass) return false;

  let context: AudioContext | null = null;
  try {
    context = new AudioContextClass();
    const encodedAudio = await blob.arrayBuffer();
    const decodedAudio = await context.decodeAudioData(encodedAudio.slice(0));
    if (!ctx.isCurrent()) {
      void context.close().catch(() => undefined);
      return true;
    }

    const protectedAudio = buildProtectedBuffer(context, decodedAudio);
    const source = context.createBufferSource();
    source.buffer = protectedAudio;
    source.connect(context.destination);
    const graph: ActiveAudioGraph = { context, source };
    ctx.audioGraphRef.current = graph;
    ctx.deferred.resolveDuration(decodedAudio.duration * 1_000);
    attachEndedHandler(ctx, graph);

    await ctx.warmup.ensureAudioWarmup();
    if (!ctx.isCurrent()) return true;
    await context.resume();
    if (!ctx.isCurrent()) return true;
    source.start(context.currentTime + AUDIO_SOURCE_SCHEDULE_AHEAD_MS / 1_000);
    ctx.warmup.finishAudioWarmupAfterHandoff();
    window.setTimeout(() => {
      if (ctx.isCurrent()) ctx.deferred.resolveStarted();
    }, EMBEDDED_AUDIO_LEAD_IN_MS + AUDIO_SOURCE_SCHEDULE_AHEAD_MS);
    return true;
  } catch {
    if (context) void context.close().catch(() => undefined);
    if (ctx.audioGraphRef.current?.context === context) {
      ctx.audioGraphRef.current = null;
    }
    // Older browsers can fail to decode an otherwise playable MP3;
    // retain the buffered HTMLAudio path as a compatibility fallback.
    return false;
  }
}
