/**
 * Owns THE one LiveKit room for an interview session.
 *
 * Hoisted above the voice / text workspace screens so a hybrid session keeps a
 * single room across both: typed turns travel `lk.chat` on the same connection
 * the voice path uses, and switching modes never opens a second room.
 *
 * Why not `<LiveKitRoom>`: that component is a thin wrapper that calls
 * `useLiveKitRoom`, spreads the returned `htmlProps` onto a `<div>`, and
 * publishes `RoomContext`. Mounting it above the screens would insert an extra
 * flex container into the middle of the layout. Using the hook directly gives
 * the identical room lifecycle with no DOM, so the existing markup is untouched.
 *
 * Lifecycle parity with the old VoiceRoom-owned room:
 *   - token is fetched the first time `active` turns true (not on mount)
 *   - `connect` is `active && token`, so `active` going false disconnects,
 *     exactly as unmounting used to
 *   - the hook disconnects on unmount, so leaving the page still tears down
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  RoomAudioRenderer,
  RoomContext,
  useLiveKitRoom,
} from "@livekit/components-react";
import {
  ConnectionState,
  DisconnectReason,
  RoomEvent,
  type Room,
} from "livekit-client";
import { toast } from "sonner";

import { useInterviewRealtimeToken } from "@/lib/api/hooks/interviews";
import type { RealtimeTokenResponse } from "@/lib/api/types";

interface InterviewRoomState {
  room: Room | undefined;
  /** True while the token request is in flight or no token has arrived yet. */
  connecting: boolean;
  /** Set when the token request failed; the room cannot be joined. */
  tokenError: string | null;
}

const InterviewRoomStateContext = createContext<InterviewRoomState>({
  room: undefined,
  connecting: false,
  tokenError: null,
});

/** Token/connection status for screens that render their own loading state. */
export function useInterviewRoomState(): InterviewRoomState {
  return useContext(InterviewRoomStateContext);
}

export function InterviewRoomProvider({
  sessionId,
  active,
  prefetch = false,
  audio,
  onUnexpectedDisconnect,
  children,
}: {
  sessionId: string | null;
  /** Whether this session should hold a live room right now. */
  active: boolean;
  /**
   * Mint the join token WITHOUT connecting yet.
   *
   * The caller holds `active` back for one beat while the client narrates the
   * onboarding transition line (only the client can voice it — the agent never
   * receives that text). Without a prefetch the token round-trip would then
   * start only after the beat, adding dead air before question one. With it,
   * the token is already in hand and `connect` flips the moment `active` does.
   */
  prefetch?: boolean;
  /** Publish the microphone. False for a typing candidate in hybrid mode. */
  audio: boolean;
  /**
   * The room dropped for a reason that is NOT the candidate's own End action
   * (resilience A-Tier-1 #3): a transient network / server disconnect that must
   * NOT finalize+grade the session.
   *
   * This policy lived in VoiceRoom before the hoist. It is here now so there is
   * exactly one place that decides what a disconnect means, and the
   * CLIENT_INITIATED filtering cannot drift between call sites.
   *
   * Returning undefined from the caller (e.g. while the candidate is typing
   * rather than speaking) means "ignore drops" — the text transport falls back
   * to REST on its own and the interview continues.
   */
  onUnexpectedDisconnect?: () => void;
  children: React.ReactNode;
}) {
  const [tokenData, setTokenData] = useState<RealtimeTokenResponse | null>(null);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const fetchToken = useInterviewRealtimeToken(sessionId);

  // Fetch once per session, the first time a room is wanted OR prefetched.
  // Deliberately not keyed on `active` alone: a voice→text→voice switch must
  // reuse the token rather than mint a new one (and re-dispatch the agent).
  const wantToken = active || prefetch;
  useEffect(() => {
    if (!wantToken || !sessionId || tokenData || isFetchingToken) return;
    let cancelled = false;
    setIsFetchingToken(true);
    setTokenError(null);
    void (async () => {
      try {
        const data = await fetchToken.mutateAsync();
        if (!cancelled) setTokenData(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get voice token";
        if (!cancelled) {
          setTokenError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setIsFetchingToken(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // fetchToken is a fresh mutation object each render; including it would loop.
  }, [wantToken, sessionId]);

  // Drop a stale token when the session changes, so a second attempt in the
  // same mounted page never joins the previous session's room.
  useEffect(() => {
    setTokenData(null);
    setTokenError(null);
  }, [sessionId]);

  const handleDisconnected = useCallback(
    (reason?: DisconnectReason) => {
      // The candidate's own End action — handled by the end/finish flow.
      if (reason === DisconnectReason.CLIENT_INITIATED) return;
      // A natural agent departure (interview genuinely finished) is signalled
      // separately by the agent-presence effect in VoiceRoom → onCompleted, so
      // anything reaching here is a failure rather than a completion.
      onUnexpectedDisconnect?.();
    },
    [onUnexpectedDisconnect],
  );

  const { room } = useLiveKitRoom({
    serverUrl: tokenData?.url,
    token: tokenData?.token,
    connect: active && Boolean(tokenData),
    audio,
    video: false,
    onDisconnected: handleDisconnected,
  });

  // `useLiveKitRoom` only applies `audio` on SignalConnected, so a mid-session
  // flip (candidate switches from typing to speaking) would otherwise never
  // reach the mic. Sync it explicitly on change and on (re)connect.
  useEffect(() => {
    if (!room) return;
    const sync = () => {
      void room.localParticipant.setMicrophoneEnabled(audio).catch(() => {
        /* mic permission handled by the caller's own checks */
      });
    };
    if (room.state === ConnectionState.Connected) sync();
    room.on(RoomEvent.Connected, sync);
    return () => {
      room.off(RoomEvent.Connected, sync);
    };
  }, [room, audio]);

  const state: InterviewRoomState = {
    room,
    // `active`, NOT `wantToken`: during the prefetch beat the room is
    // deliberately not wanted yet, and the client is still narrating the
    // transition line. Reporting "connecting" there would trip the narration
    // gate and mute exactly the line this beat exists to let through.
    connecting: active && (isFetchingToken || !tokenData),
    tokenError,
  };

  return (
    <RoomContext.Provider value={room}>
      <InterviewRoomStateContext.Provider value={state}>
        {/* Only render audio sinks while a room is wanted, so a text-only
            candidate never gets an <audio> element attached. */}
        {active && room ? <RoomAudioRenderer /> : null}
        {children}
      </InterviewRoomStateContext.Provider>
    </RoomContext.Provider>
  );
}
