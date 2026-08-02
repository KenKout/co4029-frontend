/**
 * Typed interview turns over the session's ONE LiveKit room.
 *
 * Sends the candidate's text on `lk.chat` with `turn_action` / `turn_key` as
 * stream attributes, and resolves the turn from the `abridge.interview.control`
 * topic — NOT from the send promise. That distinction is the point of this hook:
 * `sendText` resolving only means the bytes left the browser, while the turn is
 * not decided until the agent has run it through the interview brain and
 * published `completed` / `rejected` / `failed`.
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
  isTerminalStatus,
  parseControlEvent,
  shouldPreserveDraft,
  TOPIC_CHAT,
  TOPIC_CONTROL,
  type ControlEvent,
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
   * Send a typed turn and resolve once the agent reports a terminal status.
   *
   * Rejects only when the message could not be sent at all; a turn the agent
   * refuses resolves with `rejected` so the caller can keep the draft and show
   * the reason.
   */
  sendTurn: (args: {
    text: string;
    turnAction: TurnAction;
    turnKey: string;
    /** Give up waiting for control after this long. Default 60s. */
    timeoutMs?: number;
  }) => Promise<ChatTurnOutcome>;
  /** True from send until the terminal control event (or timeout). */
  pending: boolean;
  /** Whether a turn can be sent right now. */
  canSend: boolean;
  /** Most recent control event seen, for surfacing agent-side rejections. */
  lastEvent: ControlEvent | null;
}

/** Default ceiling on how long a turn may stay pending. */
const DEFAULT_TURN_TIMEOUT_MS = 60_000;

/**
 * Live connection state of a room.
 *
 * Split out of `useInterviewChat` so `canSend` reflects reality rather than a
 * stale render: the room can drop between renders and nothing would re-run
 * otherwise. Reconnecting counts as NOT connected — a turn sent mid-reconnect
 * would write into a stream the agent is not reading.
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
    room.on(RoomEvent.Connected, sync);
    room.on(RoomEvent.Disconnected, sync);
    room.on(RoomEvent.Reconnected, sync);
    room.on(RoomEvent.Reconnecting, sync);
    return () => {
      room.off(RoomEvent.Connected, sync);
      room.off(RoomEvent.Disconnected, sync);
      room.off(RoomEvent.Reconnected, sync);
      room.off(RoomEvent.Reconnecting, sync);
    };
  }, [room]);

  return connected;
}

export function useInterviewChat(
  room: Room | undefined,
  options?: { enabled?: boolean },
): UseInterviewChatResult {
  const enabled = options?.enabled ?? true;
  const [pending, setPending] = useState(false);
  const connected = useRoomConnected(room);
  const [lastEvent, setLastEvent] = useState<ControlEvent | null>(null);

  // Turns awaiting a terminal control event, keyed by turn_key. A map (not a
  // single slot) because a late event for an abandoned turn must be discardable
  // without disturbing the current one.
  const waitingRef = useRef(
    new Map<string, (outcome: ChatTurnOutcome) => void>(),
  );
  // Highest `seq` seen. Control events are ordered by this, never by arrival:
  // after a reconnect an older event can still land, and applying it would roll
  // the UI back to a previous turn's state.
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
        // A malformed control message is dropped rather than thrown: the turn
        // still resolves by timeout, and a parser bug must not break the room.
        if (!event) return;

        // Out-of-order / replayed event: ignore. `seq` is strictly increasing
        // per session on the agent side.
        if (event.seq <= lastSeqRef.current) return;
        lastSeqRef.current = event.seq;

        setLastEvent(event);

        if (!isTerminalStatus(event.status)) return;
        // `accepted` is not terminal, so anything here settles the turn.
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
  // pending forever waiting for control that can no longer arrive.
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
      timeoutMs?: number;
    }): Promise<ChatTurnOutcome> => {
      if (!room || room.state !== ConnectionState.Connected) {
        throw new Error("interview room is not connected");
      }

      const { text, turnAction, turnKey } = args;
      const timeoutMs = args.timeoutMs ?? DEFAULT_TURN_TIMEOUT_MS;

      // Register the waiter BEFORE sending: the agent can publish `accepted`
      // and even `completed` before `sendText` resolves.
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

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timedOut = new Promise<ChatTurnOutcome>((resolve) => {
        timer = setTimeout(() => {
          waitingRef.current.delete(turnKey);
          resolve({
            event: {
              status: "failed",
              turnKey,
              seq: -1,
              turnAction,
              stateVersion: null,
              rejection: null,
              state: null,
              errorClass: "ControlTimeout",
            },
            // Ambiguous: the agent may have graded the turn and we simply never
            // heard. Keeping the draft is the safe half — a retry reuses the
            // turn_key, which `take_session_step` treats idempotently.
            preserveDraft: true,
          });
        }, timeoutMs);
      });

      try {
        return await Promise.race([settled, timedOut]);
      } finally {
        if (timer) clearTimeout(timer);
        setPending(false);
      }
    },
    [room],
  );

  return {
    sendTurn,
    pending,
    canSend: enabled && connected && !pending,
    lastEvent,
  };
}
