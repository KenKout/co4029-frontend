/**
 * Ref-level audio lifecycle for the narration hook: object-URL release, the
 * keep-alive warm-up loop, and the full abort that every new turn and unmount
 * runs first.
 *
 * Moved verbatim out of `use-interview-narration.ts`. The abort ORDER matters
 * and is unchanged: bump the token, stop the warm-up, tear down the Web Audio
 * graph, pause the buffered element, release the URL, cancel the browser voice,
 * then settle the active presentation.
 */

import {
  createAudioWarmupBlob,
  nowMs,
  narrationDebugEnabled,
} from "@/lib/hooks/use-interview-narration/audio-support";
import type {
  ActiveAudioGraph,
  MutableRef,
} from "@/lib/hooks/use-interview-narration/audio-support";

export function releaseObjectUrl(
  objectUrlRef: MutableRef<string | null>,
): void {
  if (objectUrlRef.current) {
    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }
}

export function stopWarmupLoop(refs: {
  warmupAudioRef: MutableRef<HTMLAudioElement | null>;
  warmupUrlRef: MutableRef<string | null>;
}): void {
  if (refs.warmupAudioRef.current) {
    try {
      refs.warmupAudioRef.current.pause();
    } catch {
      // Audio warm-up cleanup is best-effort.
    }
    refs.warmupAudioRef.current = null;
  }
  if (refs.warmupUrlRef.current) {
    URL.revokeObjectURL(refs.warmupUrlRef.current);
    refs.warmupUrlRef.current = null;
  }
}

/** Start the looping keep-alive tone; returns the start time, or null on failure. */
export function startWarmupLoop(refs: {
  warmupAudioRef: MutableRef<HTMLAudioElement | null>;
  warmupUrlRef: MutableRef<string | null>;
  stopAudioWarmup: () => void;
}): number | null {
  try {
    const url = URL.createObjectURL(createAudioWarmupBlob());
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.loop = true;
    refs.warmupUrlRef.current = url;
    refs.warmupAudioRef.current = audio;
    const startedAt = nowMs();
    void audio.play().catch(() => undefined);
    return startedAt;
  } catch {
    refs.stopAudioWarmup();
    return null;
  }
}

export function abortNarration(refs: {
  tokenRef: MutableRef<number>;
  audioRef: MutableRef<HTMLAudioElement | null>;
  audioGraphRef: MutableRef<ActiveAudioGraph | null>;
  settleActiveRef: MutableRef<(() => void) | null>;
  stopAudioWarmup: () => void;
  releaseUrl: () => void;
  browserCancel: () => void;
}): void {
  // TEMP DIAG (narration skip B): log every cancel so we can see when a new
  // turn's narrate() aborts a prior turn whose audio hadn't started yet.
  // Enable in the deployed build with: localStorage.narrationDebug = "1"
  // (the workflow ships a production build, so import.meta.env.DEV is false).
  // Remove this block once the skip root cause is confirmed.
  if (narrationDebugEnabled()) {
    console.debug(
      `[narration] cancel — token ${refs.tokenRef.current} -> ${refs.tokenRef.current + 1}`,
      {
        hadAudioGraph: Boolean(refs.audioGraphRef.current),
        hadAudioEl: Boolean(refs.audioRef.current),
      },
    );
  }
  refs.tokenRef.current += 1;
  refs.stopAudioWarmup();
  if (refs.audioGraphRef.current) {
    const { context, source } = refs.audioGraphRef.current;
    refs.audioGraphRef.current = null;
    try {
      source.stop();
    } catch {
      // The source may already have ended.
    }
    void context.close().catch(() => undefined);
  }
  if (refs.audioRef.current) {
    try {
      refs.audioRef.current.pause();
    } catch {
      // Playback cancellation is best-effort.
    }
    refs.audioRef.current = null;
  }
  refs.releaseUrl();
  refs.browserCancel();
  refs.settleActiveRef.current?.();
  refs.settleActiveRef.current = null;
}
