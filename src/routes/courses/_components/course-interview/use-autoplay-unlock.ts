import { useEffect, useRef } from "react";

import { useStartAudio } from "@livekit/components-react";
import type { Room } from "livekit-client";


/**
 * Autoplay unlock — extracted from InterviewWorkspaceScreen so the screen
 * stays inside the lint caps.
 *
 * Browsers block audio until a user gesture, and `RoomAudioRenderer` alone
 * gives the candidate no way to grant it — they would simply hear nothing and
 * have nothing to click. `useStartAudio` reports whether playback is allowed
 * and hands back the opener; the starter template ships the same affordance.
 *
 * This is NOT covered by the existing `startAudioWarmup`: that unlocks the
 * Web Audio context used by the REST narration path, not the agent's LiveKit
 * audio track.
 */
export function useAutoplayUnlock(args: {
  /** `Room | null` accepted; the SDK hook receives `room ?? undefined`. */
  room: Room | null;
  agentOwnsTheVoice: boolean;
}) {
  const { room, agentOwnsTheVoice } = args;
  // `mergedProps` carries the onClick that performs the unlock AND a
  // `display: none` style once playback is allowed — so the button hides itself
  // and this does not need its own visibility logic. Spread it, as the starter
  // template does, rather than reaching for a bare `startAudio` (there isn't
  // one on this hook).
  const { mergedProps: startAudioProps, canPlayAudio } = useStartAudio({
    room: room ?? undefined,
    props: {},
  });
  // Auto-unlock on the candidate's FIRST gesture anywhere on the page. A
  // rejoined session already has context — a re-read is playing while the
  // "Enable audio" button waits for a click nobody remembers needing the first
  // time. The browser still requires a gesture, so the opener fires on the
  // first pointerdown/keydown (the button itself remains as the visible
  // fallback for a candidate who gestures nowhere near it).
  const audioUnlockRef = useRef<() => void>(() => undefined);
  audioUnlockRef.current = () => startAudioProps.onClick?.();
  useEffect(() => {
    if (!agentOwnsTheVoice || canPlayAudio) return;
    const unlock = () => audioUnlockRef.current();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [agentOwnsTheVoice, canPlayAudio]);
  return { startAudioProps, canPlayAudio };
}
