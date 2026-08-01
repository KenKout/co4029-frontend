/**
 * Shared handle the narration playout paths operate on: the presentation
 * promises, the warm-up window, the staleness check, and the refs that hold the
 * live audio so `cancel()` can tear it down.
 */

import type {
  ActiveAudioGraph,
  MutableRef,
} from "@/lib/hooks/use-interview-narration/audio-support";
import type { NarrationDeferred } from "@/lib/hooks/use-interview-narration/presentation";
import type { WarmupWindow } from "@/lib/hooks/use-interview-narration/warmup-window";

export interface NarrationPlaybackContext {
  deferred: NarrationDeferred;
  warmup: WarmupWindow;
  /** False once a newer turn (or unmount) has bumped the narration token. */
  isCurrent: () => boolean;
  stopAudioWarmup: () => void;
  releaseUrl: () => void;
  browserFallback: () => void;
  audioRef: MutableRef<HTMLAudioElement | null>;
  objectUrlRef: MutableRef<string | null>;
  audioGraphRef: MutableRef<ActiveAudioGraph | null>;
}
