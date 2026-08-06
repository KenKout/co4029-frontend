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
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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

import { useDispatchInterviewAgent, useInterviewRealtimeToken } from "@/lib/api/hooks/interviews";
import type { RealtimeTokenResponse } from "@/lib/api/types";

interface InterviewRoomState {
  room: Room | undefined;
  /** True while the token request is in flight or no token has arrived yet. */
  connecting: boolean;
  /**
   * True when this session is MEANT to hold a live room right now (the `active`
   * prop), regardless of how far the connection has actually got.
   *
   * The narration gate needs this rather than `connecting`. `connecting` is only
   * true while a token is being fetched, and the prefetch deliberately mints the
   * token during the transition beat — so by the time `active` flips, the token
   * is already in hand, `connecting` is false, the room is not connected yet,
   * and the gate is wide open for exactly as long as the agent takes to join.
   * The client then narrates question one, the agent joins ~10s later and says
   * the same question from the top: "phát ok rồi giữa chừng đứng lại rồi phát
   * lại từ đầu".
   *
   * `active` is false during the beat (the caller holds it back while the
   * client-only transition line plays), so gating on it does NOT re-mute that
   * line — which is the trap `connecting` was introduced to avoid.
   */
  roomWanted: boolean;
  /** Set when the token request failed; the room cannot be joined. */
  tokenError: string | null;
}

const InterviewRoomStateContext = createContext<InterviewRoomState>({
  room: undefined,
  connecting: false,
  roomWanted: false,
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
  warm = false,
  agentWanted = false,
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
  /**
   * Open the room DURING onboarding, before the interviewer exists.
   *
   * Mints a warm token (no agent dispatch) and connects with it, so the ~10-13s
   * LiveKit worker startup overlaps the setup the candidate is doing anyway
   * instead of being dead air in front of question one. The room is genuinely
   * live — it simply has nobody in it yet.
   *
   * Kept separate from `active`: `active` still means "this session is in its
   * interview", which drives the narration gate and the disconnect policy. A
   * warmed room must not make the client think the agent owns the voice.
   */
  warm?: boolean;
  /**
   * Send the interviewer in. Flip this once onboarding is complete.
   *
   * Only has an effect on a warmed room — a normally-minted token already
   * carries its dispatch. Fires exactly once per session.
   */
  agentWanted?: boolean;
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
  const dispatchAgent = useDispatchInterviewAgent(sessionId);

  // Fetch once per session, the first time a room is wanted OR prefetched OR
  // warmed. Deliberately not keyed on `active` alone: a voice→text→voice switch
  // must reuse the token rather than mint a new one (and re-dispatch the agent).
  const wantToken = active || prefetch || warm;
  // Whether the token in hand starts the interviewer on join. A token minted
  // during onboarding cannot (the backend refuses to dispatch that early), so
  // the agent has to be sent in explicitly later.
  const mintedWarmRef = useRef(false);
  useEffect(() => {
    if (!wantToken || !sessionId || tokenData || isFetchingToken) return;
    let cancelled = false;
    // Warm ONLY while nothing else already wants a real room: once `active` or
    // `prefetch` is true the session is past onboarding, and a dispatching
    // token is both allowed and simpler (no second call to get wrong).
    const mintWarm = warm && !active && !prefetch;
    setIsFetchingToken(true);
    setTokenError(null);
    void (async () => {
      try {
        const data = await fetchToken.mutateAsync({ warm: mintWarm });
        if (!cancelled) {
          mintedWarmRef.current = mintWarm;
          setTokenData(data);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get voice token";
        if (!cancelled) {
          setTokenError(message);
          // A failed WARM mint is not worth interrupting the candidate over:
          // the room simply is not pre-opened, and the normal mint still runs
          // when onboarding completes. Only a real one gets a toast.
          if (!mintWarm) toast.error(message);
        }
      } finally {
        if (!cancelled) setIsFetchingToken(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // fetchToken is a fresh mutation object each render; including it would loop.
  }, [wantToken, sessionId, warm, active, prefetch]);

  // Send the interviewer into a warmed room, once and only once.
  //
  // Skipped entirely when the token already carried its dispatch, so the
  // original flow makes no extra call. If this fails the candidate would sit in
  // a room with nobody in it, so the token is dropped: the next mint runs with
  // `warm=false` and dispatches the agent the old way.
  const dispatchedRef = useRef(false);
  useEffect(() => {
    if (!agentWanted || !sessionId || dispatchedRef.current) return;
    if (!tokenData || !mintedWarmRef.current) return;
    dispatchedRef.current = true;
    void (async () => {
      try {
        await dispatchAgent.mutateAsync();
      } catch {
        // Fall back to the embedded-dispatch path rather than leaving an empty
        // room: clearing the token re-runs the mint, this time without `warm`.
        dispatchedRef.current = false;
        mintedWarmRef.current = false;
        setTokenData(null);
      }
    })();
    // dispatchAgent is a fresh mutation object each render; including it loops.
  }, [agentWanted, sessionId, tokenData]);

  // Drop a stale token when the session changes, so a second attempt in the
  // same mounted page never joins the previous session's room.
  useEffect(() => {
    setTokenData(null);
    setTokenError(null);
    mintedWarmRef.current = false;
    dispatchedRef.current = false;
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
    // `active || warm`: warming is pointless unless the client actually
    // CONNECTS during setup — that connection is what overlaps the worker
    // startup with onboarding. `active` still gates everything else (narration,
    // disconnect policy, mic), so a warmed room does not read as a live
    // interview anywhere but here.
    connect: (active || warm) && Boolean(tokenData),
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
    // Also `active`, and for the narration gate this is the one that matters:
    // it stays true across the whole join, including the window where the
    // token is already in hand but the agent has not arrived yet.
    roomWanted: active,
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
