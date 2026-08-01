/**
 * Output-route warm-up window for one narration turn.
 *
 * `ensureAudioWarmup` holds playout back until the keep-alive loop has run for
 * `AUDIO_OUTPUT_WARMUP_MS`; `finishAudioWarmupAfterHandoff` keeps it running
 * `AUDIO_OUTPUT_HANDOFF_OVERLAP_MS` into the real audio so a power-managed DAC
 * cannot re-idle and clip the first syllable. Both moved verbatim out of
 * `use-interview-narration.ts` — same durations, same staleness guard.
 */

import {
  AUDIO_OUTPUT_HANDOFF_OVERLAP_MS,
  AUDIO_OUTPUT_WARMUP_MS,
} from "@/lib/hooks/use-interview-narration/constants";
import { nowMs } from "@/lib/hooks/use-interview-narration/audio-support";

export interface WarmupWindow {
  ensureAudioWarmup: () => Promise<void>;
  finishAudioWarmupAfterHandoff: () => void;
}

export function createWarmupWindow(params: {
  warmupStartedAt: number | null;
  isCurrent: () => boolean;
  stopAudioWarmup: () => void;
}): WarmupWindow {
  const { warmupStartedAt, isCurrent, stopAudioWarmup } = params;
  return {
    ensureAudioWarmup: async () => {
      if (warmupStartedAt !== null) {
        const remaining = AUDIO_OUTPUT_WARMUP_MS - (nowMs() - warmupStartedAt);
        if (remaining > 0) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, remaining);
          });
        }
      }
    },
    finishAudioWarmupAfterHandoff: () => {
      window.setTimeout(() => {
        if (isCurrent()) stopAudioWarmup();
      }, AUDIO_OUTPUT_HANDOFF_OVERLAP_MS);
    },
  };
}
