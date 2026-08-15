/**
 * Typed interview turns over the session's ONE LiveKit room.
 *
 * Sends the candidate's text on `lk.chat` with `turn_action` / `turn_key` as
 * stream attributes, and settles the turn from the `abridge.interview.control`
 * topic — NOT from the send promise. That distinction is the point of this hook:
 * `sendText` resolving only means the bytes left the browser, while the agent has
 * not confirmed it took the turn until it acks on control.
 *
 * A turn settles on `accepted`, and there is deliberately NO timeout. The agent
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
  agentActions: readonly { kind: string; seq: number }[];
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
    readonly { kind: string; seq: number }[]
  >([]);

  const onSnapshotRef = useRef(options?.onSnapshot);
  onSnapshotRef.current = options?.onSnapshot;

  // Turns awaiting their ack, keyed by turn_key. A map (not a single slot)
  // because a late event for an abandoned turn must be discardable without
  // disturbing the current one.
  const waitingRef = useRef(
    new Map<string, (outcome: ChatTurnOutcome) => void>(),
  );
  // Highest `seq` seen — the WHOLE ordering protocol, shared by both channels on
  // this topic. Control events are ordered by this, never by arrival: after a
  // reconnect an older event can still land, and applying it would roll the UI
  // back to a previous turn's or snapshot's state.
  const lastSeqRef = useRef(-1);

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

        // Out-of-order / replayed event: ignore. `seq` is strictly increasing
        // per session on the agent side.
        if (event.seq <= lastSeqRef.current) return;
        lastSeqRef.current = event.seq;

        setLastEvent(event);

        if (event.status === "agent_action") {
          const kind = event.actionKind ?? event.turnAction;
          if (kind !== DEFAULT_TURN_ACTION) {
            setAgentActions((current) =>
              [...current, { kind, seq: event.seq }].slice(-8),
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
        if (!resolve) return;
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
          status: "failed",
          turnKey: key,
          seq: -1,
          turnAction: "answer",
          stateVersion: null,
          rejection: null,
          state: null,
          errorClass: "RoomDisconnected",
          snapshot: null,
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
      const settled = new Promise<ChatTurnOutcome>((resolve) => {
        waitingRef.current.set(turnKey, resolve);
      });

      setPending(true);
      try {
        await room.localParticipant.sendText(text, {
          topic: TOPIC_CHAT,
          attributes: chatAttributes({ turnAction, turnKey }),
        });
      } catch (err) {
        waitingRef.current.delete(turnKey);
        setPending(false);
        throw err;
      }

      // No ceiling on this wait. The only ways it can fail to settle are a
      // refusal (which the agent publishes) and the room going away (handled by
      // the drop effect above) — a slow LLM turn is not one of them, and
      // synthesising a failure for it reported a phantom send failure for a turn
      // the candidate had already been answered.
      try {
        return await settled;
      } finally {
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
