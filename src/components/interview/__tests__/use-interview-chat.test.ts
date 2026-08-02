import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ConnectionState, RoomEvent } from "livekit-client";
import type { Room } from "livekit-client";

import { useInterviewChat } from "../use-interview-chat";
import type {
  ChatTurnOutcome,
  UseInterviewChatResult,
} from "../use-interview-chat";
import { TOPIC_CHAT, TOPIC_CONTROL } from "@/lib/interview/control-protocol";

/**
 * A stand-in for `Room` that mirrors the REAL API surface this hook touches.
 *
 * Mirroring matters more than convenience here: a fake that exposes a
 * convenient-but-wrong shape makes the suite pass while production breaks. The
 * backend half of this feature shipped exactly that bug — every control event
 * was dropped because the code read `session.room` while the real object
 * exposes `session.room_io.room`, and the fake happened to have `.room`. So the
 * members below are named and typed as livekit-client declares them:
 *
 *   state                        ConnectionState
 *   on / off                     RoomEvent listeners
 *   registerTextStreamHandler    (topic, handler) — throws on duplicate topic
 *   unregisterTextStreamHandler  (topic)
 *   localParticipant.sendText    (text, { topic, attributes })
 *   localParticipant.publishData (the DEPRECATED path, asserted unused)
 */
function makeFakeRoom() {
  const listeners = new Map<string, Set<() => void>>();
  const handlers = new Map<
    string,
    (reader: { readAll: () => Promise<string> }, p: { identity: string }) => void
  >();
  const sendText = vi.fn(() => Promise.resolve({ id: "stream-1" }));
  const publishData = vi.fn(() => Promise.resolve());

  const room = {
    state: ConnectionState.Connected,
    localParticipant: { sendText, publishData },
    on(event: string, cb: () => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
      return room;
    },
    off(event: string, cb: () => void) {
      listeners.get(event)?.delete(cb);
      return room;
    },
    registerTextStreamHandler(
      topic: string,
      handler: (
        reader: { readAll: () => Promise<string> },
        p: { identity: string },
      ) => void,
    ) {
      if (handlers.has(topic)) {
        // The real SDK throws when a topic already has a handler. Reproduced so
        // a leaked registration surfaces as a failure here.
        throw new Error(`handler already set for topic ${topic}`);
      }
      handlers.set(topic, handler);
    },
    unregisterTextStreamHandler(topic: string) {
      handlers.delete(topic);
    },
  };

  return {
    room: room as unknown as Room,
    sendText,
    publishData,
    /** Push one control message, as the agent's text stream would. */
    async emitControl(payload: unknown) {
      const handler = handlers.get(TOPIC_CONTROL);
      if (!handler) throw new Error("no control handler registered");
      const raw =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      await act(async () => {
        handler({ readAll: () => Promise.resolve(raw) }, { identity: "agent" });
        // let the handler's async readAll microtask flush
        await Promise.resolve();
        await Promise.resolve();
      });
    },
    setState(next: ConnectionState) {
      room.state = next;
      act(() => {
        const event =
          next === ConnectionState.Connected
            ? RoomEvent.Connected
            : RoomEvent.Disconnected;
        listeners.get(event)?.forEach((cb) => cb());
      });
    },
    hasControlHandler: () => handlers.has(TOPIC_CONTROL),
  };
}

/** A well-formed control event, as the backend's ControlEvent.to_json emits. */
function control(over: Record<string, unknown> = {}) {
  return {
    status: "completed",
    turn_key: "tk-abcdefgh",
    seq: 1,
    turn_action: "answer",
    state_version: 7,
    state: {
      is_finished: false,
      next_question_text: "Next one?",
      followup_text: null,
      ai_turn_text: null,
      question_type: "conceptual",
      time_remaining_seconds: 900,
    },
    ...over,
  };
}

/**
 * Start a turn inside `act` so the synchronous `setPending(true)` — and the
 * microtask in which `sendText` resolves — are both applied before the test
 * asserts. Without this React warns, and `pending` reads as its pre-update
 * value, which would make the pending-gate assertions vacuous.
 */
/**
 * Start a turn inside a SYNCHRONOUS act().
 *
 * `sendTurn` returns a promise that deliberately stays pending until a terminal
 * control event arrives, so `await act(async () => ...)` never settles and every
 * test using it times out. Sync act is the right tool: it flushes the
 * `setPending(true)` state update that happens synchronously on send, which is
 * all React needs to stop warning, and leaves the returned promise alone for the
 * test to resolve on its own terms.
 */
function startTurn(
  result: { current: UseInterviewChatResult },
  args: Parameters<UseInterviewChatResult["sendTurn"]>[0],
): Promise<ChatTurnOutcome> {
  let promise!: Promise<ChatTurnOutcome>;
  act(() => {
    promise = result.current.sendTurn(args);
  });
  return promise;
}

const TURN = {
  text: "my answer",
  turnAction: "answer" as const,
  turnKey: "tk-abcdefgh",
};

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useInterviewChat — sending", () => {
  it("sends on the lk.chat topic with turn_action and turn_key attributes", async () => {
    // The whole point of the attribute transport: the action must ride along, or
    // the agent grades a hint request as an answer.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, {
      text: "give me a hint",
      turnAction: "hint",
      turnKey: "tk-hint1234",
    });
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());

    expect(fake.sendText).toHaveBeenCalledWith("give me a hint", {
      topic: TOPIC_CHAT,
      attributes: { turn_action: "hint", turn_key: "tk-hint1234" },
    });

    await fake.emitControl(control({ turn_key: "tk-hint1234" }));
    await promise;
  });

  it("never uses the deprecated publishData path", async () => {
    // `useChat().send()` publishes a SECOND copy over publishData for old
    // servers. One typed message must produce exactly one turn, so this hook
    // calls sendText directly — this asserts that choice cannot regress.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());
    await fake.emitControl(control());
    await promise;

    expect(fake.publishData).not.toHaveBeenCalled();
  });

  it("throws rather than sending when the room is not connected", async () => {
    const fake = makeFakeRoom();
    fake.setState(ConnectionState.Disconnected);
    const { result } = renderHook(() => useInterviewChat(fake.room));

    await expect(result.current.sendTurn(TURN)).rejects.toThrow(
      /not connected/i,
    );
    expect(fake.sendText).not.toHaveBeenCalled();
  });
});

describe("useInterviewChat — pending is driven by control, not by send", () => {
  it("stays pending after sendText resolves, until a terminal event", async () => {
    // This is the requirement that separates this hook from a plain mutation:
    // bytes leaving the browser says nothing about whether the turn was graded.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());
    // sendText has already resolved by now.
    await waitFor(() => expect(result.current.pending).toBe(true));

    await fake.emitControl(control());
    await promise;
    await waitFor(() => expect(result.current.pending).toBe(false));
  });

  it("does NOT settle the turn on `accepted`", async () => {
    // `accepted` means the agent took the turn, not that the brain finished.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    let settled = false;
    const started = startTurn(result, TURN);
    const promise = started.then((outcome) => {
      settled = true;
      return outcome;
    });
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());

    await fake.emitControl(control({ status: "accepted", seq: 1, state: null }));
    expect(settled).toBe(false);
    expect(result.current.pending).toBe(true);

    await fake.emitControl(control({ status: "completed", seq: 2 }));
    const outcome = await promise;
    expect(settled).toBe(true);
    expect(outcome.event.status).toBe("completed");
  });
});

describe("useInterviewChat — outcomes and the draft", () => {
  it("clears the draft only on completed", async () => {
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());
    await fake.emitControl(control({ status: "completed" }));

    const outcome = await promise;
    expect(outcome.preserveDraft).toBe(false);
    expect(outcome.event.stateVersion).toBe(7);
    expect(outcome.event.state?.next_question_text).toBe("Next one?");
  });

  it("preserves the draft on a rejected turn and reports why", async () => {
    // A turn refused because another is in flight was never graded — losing the
    // candidate's typing here would be a data-loss bug under time pressure.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());
    await fake.emitControl(
      control({
        status: "rejected",
        rejection: "turn_in_flight",
        state: null,
        state_version: undefined,
      }),
    );

    const outcome = await promise;
    expect(outcome.preserveDraft).toBe(true);
    expect(outcome.event.rejection).toBe("turn_in_flight");
  });

  it("preserves the draft on a failed turn", async () => {
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());
    await fake.emitControl(
      control({
        status: "failed",
        error_class: "TimeoutError",
        state: null,
      }),
    );

    const outcome = await promise;
    expect(outcome.preserveDraft).toBe(true);
    expect(outcome.event.errorClass).toBe("TimeoutError");
  });
});

describe("useInterviewChat — ordering and reconnect", () => {
  it("ignores a stale event that arrives after a newer one", async () => {
    // LiveKit gives no cross-stream ordering guarantee, and a reconnect can
    // replay. Applying an older event would roll the UI back a turn.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());

    await fake.emitControl(control({ status: "completed", seq: 5 }));
    await promise;
    const afterFresh = result.current.lastEvent;

    // Older seq for a different turn: must not become lastEvent.
    await fake.emitControl(
      control({ status: "rejected", seq: 2, turn_key: "tk-zzzzzzzz" }),
    );
    expect(result.current.lastEvent).toBe(afterFresh);
  });

  it("does not settle a turn from an event with a different turn_key", async () => {
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    let settled = false;
    const started = startTurn(result, TURN);
    const promise = started.then((o) => {
      settled = true;
      return o;
    });
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());

    await fake.emitControl(control({ seq: 1, turn_key: "tk-other111" }));
    expect(settled).toBe(false);

    await fake.emitControl(control({ seq: 2, turn_key: TURN.turnKey }));
    await promise;
    expect(settled).toBe(true);
  });

  it("fails an in-flight turn when the room drops", async () => {
    // Otherwise the composer sits pending forever waiting for control that can
    // no longer arrive.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());

    fake.setState(ConnectionState.Disconnected);

    // `sendTurn` sets pending=false in a `finally`, i.e. a microtask AFTER the
    // waiter resolves — so awaiting the promise has to happen inside act() too.
    let outcome!: ChatTurnOutcome;
    await act(async () => {
      outcome = await promise;
    });
    expect(outcome.event.status).toBe("failed");
    expect(outcome.event.errorClass).toBe("RoomDisconnected");
    expect(outcome.preserveDraft).toBe(true);
    await waitFor(() => expect(result.current.pending).toBe(false));
  });

  it("drops a malformed control message without breaking the room", async () => {
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());

    await fake.emitControl("not json at all");
    await fake.emitControl(control({ status: "bogus_status" }));
    expect(result.current.pending).toBe(true);

    await fake.emitControl(control({ status: "completed" }));
    await expect(promise).resolves.toBeTruthy();
  });
});

describe("useInterviewChat — canSend", () => {
  it("is false while disabled, disconnected, or pending", async () => {
    const fake = makeFakeRoom();
    const { result, rerender } = renderHook(
      ({ enabled }) => useInterviewChat(fake.room, { enabled }),
      { initialProps: { enabled: true } },
    );

    expect(result.current.canSend).toBe(true);

    rerender({ enabled: false });
    expect(result.current.canSend).toBe(false);

    rerender({ enabled: true });
    fake.setState(ConnectionState.Disconnected);
    expect(result.current.canSend).toBe(false);

    fake.setState(ConnectionState.Connected);
    await waitFor(() => expect(result.current.canSend).toBe(true));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(result.current.pending).toBe(true));
    expect(result.current.canSend).toBe(false);

    await fake.emitControl(control());
    await promise;
  });

  it("is false when there is no room at all", () => {
    const { result } = renderHook(() => useInterviewChat(undefined));
    expect(result.current.canSend).toBe(false);
  });
});

describe("useInterviewChat — handler lifecycle", () => {
  it("registers the control handler and releases it on unmount", () => {
    // The SDK throws on a duplicate topic registration, so a leaked handler
    // would break the next mount rather than fail quietly.
    const fake = makeFakeRoom();
    const { unmount } = renderHook(() => useInterviewChat(fake.room));
    expect(fake.hasControlHandler()).toBe(true);

    unmount();
    expect(fake.hasControlHandler()).toBe(false);

    // Remounting must not throw.
    const second = renderHook(() => useInterviewChat(fake.room));
    expect(fake.hasControlHandler()).toBe(true);
    second.unmount();
  });

  it("registers no handler while disabled", () => {
    const fake = makeFakeRoom();
    renderHook(() => useInterviewChat(fake.room, { enabled: false }));
    expect(fake.hasControlHandler()).toBe(false);
  });
});
