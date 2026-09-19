/**
 * Typed interview turns over the session's ONE LiveKit room.
 *
 * Sends the candidate's text on `lk.chat` with `turn_action` / `turn_key` as
 * stream attributes, and settles the turn from the `abridge.interview.control`
 * topic — NOT from the send promise. That distinction is the point of this hook:
 * `sendText` resolving only means the bytes left the browser, while the agent has
 * not confirmed it took the turn until it acks on control.
 *
 * A turn settles on `accepted`, or on a retryable `AckTimeout` failure when
 * the ack never arrives (see ACK_TIMEOUT_MS). The agent
 * streams: it acks, then reports every state change as a session-scoped snapshot
 * on the same topic. There is no later instant at which one structured turn
 * result becomes true, so waiting past the ack means waiting for a message that
 * never comes — which is exactly how a 60s ceiling came to report "could not be
 * sent" for answers the agent had already heard and answered.
 *
 * The control topic carries both channels, and `registerTextStreamHandler` is
 * per-topic and THROWS on a duplicate. So there is one handler here that fans
 * out internally: turn acks resolve waiters, snapshots go to state and to
 * `onSnapshot`.
 *
 * Why `room.localParticipant.sendText` rather than `useChat().send`:
 * `setupChat`'s send publishes the message a SECOND time through the deprecated
 * `publishData` path (topic `lk-chat-topic`) for pre-1.8.2 servers. That legacy
 * duplicate is explicitly out of scope here — one message must produce exactly
 * one turn — so this calls the text-stream API directly. `sendText` is what
 * `setupChat` itself calls for the modern path, with the same topic and the same
 * attributes, so nothing is lost.
 *
 * Agent output (its questions and spoken transcript) is NOT read here: that
 * arrives on `lk.transcription`, rendered by the existing transcript surface.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionState, RoomEvent, type Room } from "livekit-client";

import {
  chatAttributes,
  DEFAULT_TURN_ACTION,
  parseControlEvent,
  settlesTurn,
  shouldPreserveDraft,
  TOPIC_CHAT,
  TOPIC_CONTROL,
  type ControlEvent,
  type StateSnapshot,
  type TurnAction,
} from "@/lib/interview/control-protocol";
import { StreamOrderTracker } from "@/lib/interview/stream-order";

/**
 * Ceiling for the AGENT ACK (not the answer): a turn whose ack never arrives
 * within this window resolves as a retryable `AckTimeout` failure instead of
 * holding the composer in `sending` forever on a zombie room.
 */
const ACK_TIMEOUT_MS = 20_000;

/** The synthetic failed outcome a tripped ACK deadline resolves with. */
function ackTimeoutOutcome(
  turnKey: string,
  turnAction: TurnAction,
): ChatTurnOutcome {
  return {
    event: {
      status: "failed",
      turnKey,
      seq: -1,
      turnAction,
      stateVersion: null,
      rejection: null,
      state: null,
      actionKind: null,
      actionText: null,
      errorClass: "AckTimeout",
      snapshot: null,
      streamId: null,
    },
    preserveDraft: true,
  };
}

/** Outcome of one typed turn, resolved from the control topic. */
export interface ChatTurnOutcome {
  event: ControlEvent;
  /** Keep the candidate's draft in the editor (rejected / failed). */
  preserveDraft: boolean;
}

export interface UseInterviewChatResult {
  /**
   * Send a typed turn and resolve once the agent acks it on the control topic.
   *
   * Rejects only when the message could not be sent at all; a turn the agent
   * refuses resolves with `rejected` so the caller can keep the draft and show
   * the reason. Resolving with `accepted` means "the agent has your text", never
   * "your answer has been graded".
   */
  sendTurn: (args: {
    text: string;
    turnAction: TurnAction;
    turnKey: string;
  }) => Promise<ChatTurnOutcome>;
  /** True from send until the agent acks (or refuses) the turn. */
  pending: boolean;
  /** Whether a turn can be sent right now. */
  canSend: boolean;
  /**
   * Whether the room is currently connected. Distinct from `canSend` (which also
   * folds in `pending`): the voice-handover gate needs to know the room is up
   * even while a previous turn is still in flight.
   */
  connected: boolean;
  /** Most recent control event seen, for surfacing agent-side rejections. */
  lastEvent: ControlEvent | null;
  /** Most recent session snapshot, or null before the first one lands. */
  snapshot: StateSnapshot | null;
  /**
   * Beats the server has announced, in arrival order ("hint", "clarify",
   * "question"). Each entry applies to the agent's NEXT live utterance; the
   * stage consumes them as those utterances appear.
   */
  agentActions: readonly { kind: string; seq: number; text?: string }[];
}

export interface UseInterviewChatOptions {
  enabled?: boolean;
  /**
   * Called for every snapshot that passes the `seq` guard, in arrival order.
   *
   * A callback rather than a second stream handler: registration is per-topic and
   * the SDK throws on a duplicate, so the one handler below fans out. Read
   * through a ref so a new closure identity each render cannot churn that
   * registration.
   */
  onSnapshot?: (snapshot: StateSnapshot) => void;
  /**
   * A turn-scoped FAILED whose waiter is GONE — the ack resolved the submit
   * long before the fold failed. The composer is not spinning, so this must
   * not be dropped: the parked sent-draft for `turnKey` is still there (no
   * confirmation was ever published) and the candidate needs the retryable
   * failure surfaced with that exact draft restored.
   */
  onLateFailure?: (event: ControlEvent) => void;
}

/**
 * Live connection state of a room.
 *
 * Split out of `useInterviewChat` so `canSend` reflects reality rather than a
 * stale render: the room can drop between renders and nothing would re-run
 * otherwise. Reconnecting counts as NOT connected — a turn sent mid-reconnect
 * would write into a stream the agent is not reading.
 *
 * `SignalReconnecting` is subscribed for the same reason, and it is the easy
 * one to miss: the SDK documents it as "not noticeable to users most of the
 * time" because media keeps flowing, so `RoomEvent.Reconnecting` never fires.
 * Without it `room.state` becomes `signalReconnecting` while this hook still
 * reports the last value it saw — `connected: true` — so the composer stays
 * unlocked and writes a turn onto a signal channel that is currently broken.
 * `lk.chat` and the control topic both ride that channel, so the turn either
 * throws on send or hangs until the drop effect releases it.
 */
function useRoomConnected(room: Room | undefined): boolean {
  const [connected, setConnected] = useState(
    room?.state === ConnectionState.Connected,
  );

  useEffect(() => {
    if (!room) {
      setConnected(false);
      return;
    }
    const sync = () => setConnected(room.state === ConnectionState.Connected);
    sync();
    // Every event that can change `room.state`. Missing one leaves this hook
    // reporting a stale value until some unrelated event happens to fire.
    const events = [
      RoomEvent.Connected,
      RoomEvent.Disconnected,
      RoomEvent.Reconnected,
      RoomEvent.Reconnecting,
      RoomEvent.SignalReconnecting,
    ] as const;
    for (const event of events) room.on(event, sync);
    return () => {
      for (const event of events) room.off(event, sync);
    };
  }, [room]);

  return connected;
}

export function useInterviewChat(
  room: Room | undefined,
  options?: UseInterviewChatOptions,
): UseInterviewChatResult {
  const enabled = options?.enabled ?? true;
  const [pending, setPending] = useState(false);
  const connected = useRoomConnected(room);
  const [lastEvent, setLastEvent] = useState<ControlEvent | null>(null);
  const [snapshot, setSnapshot] = useState<StateSnapshot | null>(null);
  const [agentActions, setAgentActions] = useState<
    readonly { kind: string; seq: number; text?: string }[]
  >([]);

  const onSnapshotRef = useRef(options?.onSnapshot);
  onSnapshotRef.current = options?.onSnapshot;
  const onLateFailureRef = useRef(options?.onLateFailure);
  onLateFailureRef.current = options?.onLateFailure;

  // Turns awaiting their ack, keyed by turn_key. A map (not a single slot)
  // because a late event for an abandoned turn must be discardable without
  // disturbing the current one.
  const waitingRef = useRef(
    new Map<string, (outcome: ChatTurnOutcome) => void>(),
  );
  // Ordering across agent epochs: `seq` is only comparable WITHIN one agent's
  // stream (a replacement agent restarts it at 1), so a global last-seen value
  // would drop every frame of the new agent. The tracker scopes comparisons to
  // the active tagged epoch, drops frames from retired epochs, and keeps the
  // legacy global-sequence behaviour for untagged frames until the first tagged
  // one arrives. See `stream-order.ts`.
  const orderRef = useRef(new StreamOrderTracker());

  // Subscribe to the control topic for the room's lifetime, not per-send: an
  // agent can publish `accepted` before a slow `sendText` promise settles, and a
  // handler registered after the fact would miss it.
  useEffect(() => {
    if (!room || !enabled) return;

    const handler = (
      reader: { readAll: () => Promise<string> },
      _participant: { identity: string },
    ) => {
      void (async () => {
        let raw: string;
        try {
          raw = await reader.readAll();
        } catch {
          return;
        }
        const event = parseControlEvent(raw);
        // A malformed control message is dropped rather than thrown: the room
        // drop path still releases any waiter, and a parser bug must not tear
        // down the room over one frame.
        if (!event) return;

        // Out-of-order / replayed / retired-epoch event: ignore. Ordering is
        // scoped to the active agent epoch (or the legacy global sequence).
        if (!orderRef.current.accept(event)) return;

        setLastEvent(event);

        if (event.status === "agent_action") {
          const kind = event.actionKind ?? event.turnAction;
          if (kind !== DEFAULT_TURN_ACTION) {
            setAgentActions((current) =>
              [...current, { kind, seq: event.seq, text: event.actionText ?? undefined }].slice(-8),
            );
          }
          return;
        }

        if (!settlesTurn(event.status)) {
          const next = event.snapshot;
          if (!next) return;
          setSnapshot(next);
          onSnapshotRef.current?.(next);
          return;
        }

        const key = event.turnKey;
        if (!key) return;
        const resolve = waitingRef.current.get(key);
        if (!resolve) {
          // No waiter: the ack already resolved this turn, so this is a LATE
          // fold failure. Dropping it used to leave the candidate believing
          // their answer was in — the parked draft was never confirmed and
          // the failure was invisible. Surface it unless the turn was already
          // confirmed (a confirmed key cannot retroactively fail) or belongs
          // to an older question.
          if (event.status === "failed") {
            onLateFailureRef.current?.(event);
          }
          return;
        }
        waitingRef.current.delete(key);
        resolve({
          event,
          preserveDraft: shouldPreserveDraft(event.status),
        });
      })();
    };

    room.registerTextStreamHandler(TOPIC_CONTROL, handler);
    return () => {
      // Registration is per-topic and throws if a second handler is added, so
      // the cleanup must run even when only `enabled` flipped.
      try {
        room.unregisterTextStreamHandler(TOPIC_CONTROL);
      } catch {
        /* already gone (room disconnected and cleaned up its handlers) */
      }
    };
  }, [room, enabled]);

  // Fail every in-flight turn when the room drops, so the composer cannot sit
  // pending forever waiting for an ack that can no longer arrive. With the
  // timeout gone this is the ONLY thing that releases a stuck waiter, so it is
  // load-bearing rather than defensive.
  useEffect(() => {
    if (connected) return;
    const waiting = waitingRef.current;
    if (waiting.size === 0) return;
    for (const [key, resolve] of waiting) {
      resolve({
        event: {
          ...ackTimeoutOutcome(key, "answer").event,
          errorClass: "RoomDisconnected",
        },
        // A turn cut off mid-flight was never graded — keep the draft so the
        // candidate can retry (same turn_key stays idempotent server-side).
        preserveDraft: true,
      });
    }
    waiting.clear();
    setPending(false);
  }, [connected]);

  const sendTurn = useCallback(
    async (args: {
      text: string;
      turnAction: TurnAction;
      turnKey: string;
    }): Promise<ChatTurnOutcome> => {
      if (!room || room.state !== ConnectionState.Connected) {
        throw new Error("interview room is not connected");
      }

      const { text, turnAction, turnKey } = args;

      // Register the waiter BEFORE sending: the agent acks as soon as the text
      // arrives, which can be before `sendText` resolves.
      let resolveTurn!: (outcome: ChatTurnOutcome) => void;
      const settled = new Promise<ChatTurnOutcome>((resolve) => {
        resolveTurn = resolve;
      });
      waitingRef.current.set(turnKey, resolveTurn);

      // Audit P2 (ACK deadline): the ACK must arrive within a bounded window —
      // a connected room with a dead/hung agent would otherwise hold the
      // composer in `sending` forever. This is an ACK ceiling, not a result
      // ceiling: the agent acks BEFORE it starts answering, so a slow LLM turn
      // never trips it. On timeout the turn resolves as a retryable failure
      // (draft preserved; the same turn_key stays idempotent server-side for
      // the manual retry). A genuinely late ack lands on the removed waiter
      // and is discarded by the no-waiter path.
      const ackTimer = window.setTimeout(() => {
        if (!waitingRef.current.has(turnKey)) return;
        waitingRef.current.delete(turnKey);
        resolveTurn(ackTimeoutOutcome(turnKey, turnAction));
      }, ACK_TIMEOUT_MS);

      setPending(true);
      try {
        await room.localParticipant.sendText(text, {
          topic: TOPIC_CHAT,
          attributes: chatAttributes({ turnAction, turnKey }),
        });
      } catch (err) {
        window.clearTimeout(ackTimer);
        waitingRef.current.delete(turnKey);
        setPending(false);
        throw err;
      }

      // The only ways this can fail to settle are a refusal (which the agent
      // publishes), the room going away (drop effect above), and the ACK
      // deadline — a slow LLM answer is NOT one of them: the ack precedes the
      // answer, so waiting for the ack is bounded by construction.
      try {
        return await settled;
      } finally {
        window.clearTimeout(ackTimer);
        setPending(false);
      }
    },
    [room],
  );

  return {
    sendTurn,
    pending,
    canSend: enabled && connected && !pending,
    connected,
    lastEvent,
    snapshot,
    agentActions,
  };
}
