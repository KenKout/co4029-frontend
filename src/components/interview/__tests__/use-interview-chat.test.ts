import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ConnectionState, RoomEvent } from "livekit-client";
import type { Room } from "livekit-client";

import { useInterviewChat } from "../use-interview-chat";
import type {
  ChatTurnOutcome,
  UseInterviewChatResult,
} from "../use-interview-chat";
import {
  TOPIC_CHAT,
  TOPIC_CONTROL,
  type StateSnapshot,
} from "@/lib/interview/control-protocol";

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
/**
 * The RoomEvent livekit-client emits when the room enters each state.
 *
 * Mirrors the SDK so the double cannot be gentler than production. Note
 * `SignalReconnecting`: it fires on its own when only the signal channel drops
 * (media keeps flowing), so a hook that listens for `Reconnecting` alone never
 * hears about it.
 */
const STATE_EVENT: Record<ConnectionState, RoomEvent> = {
  [ConnectionState.Connected]: RoomEvent.Connected,
  [ConnectionState.Disconnected]: RoomEvent.Disconnected,
  [ConnectionState.Connecting]: RoomEvent.Reconnecting,
  [ConnectionState.Reconnecting]: RoomEvent.Reconnecting,
  [ConnectionState.SignalReconnecting]: RoomEvent.SignalReconnecting,
};

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
    /**
     * Move the room to `next` and fire the event the real SDK would.
     *
     * The mapping matters: an earlier version fired only Connected /
     * Disconnected, which meant a hook that forgot to subscribe
     * `SignalReconnecting` still passed — the fake never emitted the event that
     * would have exposed it. Keep this mirroring livekit-client, and prefer a
     * failure here over a friendlier double.
     */
    setState(next: ConnectionState) {
      room.state = next;
      act(() => {
        const event = STATE_EVENT[next];
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
      // The full serialized InterviewSubmitAnswerResponse — the same shape the
      // bridge publishes from from_step_result().model_dump(mode="json").
      next_question: {
        id: "11111111-1111-1111-1111-111111111111",
        prompt_text: "Next one?",
        question_type: "conceptual",
      },
      is_finished: false,
      ai_followup_text: null,
      time_remaining_seconds: 900,
      ai_turn_text: null,
      language: "en",
      should_narrate: null,
      should_await_response: null,
      should_finish: null,
      assistance_kind: null,
      pending_confirmation: null,
      interaction_state: null,
      transition_id: null,
      transition_text: null,
      transition_target: null,
    },
    ...over,
  };
}

/**
 * Start a turn inside a SYNCHRONOUS act().
 *
 * `sendTurn` returns a promise that deliberately stays pending until the agent's
 * ack arrives, so `await act(async () => ...)` never settles and every test using
 * it times out. Sync act is the right tool: it flushes the
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
  it("stays pending after sendText resolves, until the agent acks", async () => {
    // This is the requirement that separates this hook from a plain mutation:
    // bytes leaving the browser says nothing about whether the agent took the
    // turn — only the control topic does.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());
    // sendText has already resolved by now.
    await waitFor(() => expect(result.current.pending).toBe(true));

    await fake.emitControl(control({ status: "accepted", state: null }));
    await promise;
    await waitFor(() => expect(result.current.pending).toBe(false));
  });

  it("settles the turn on `accepted`", async () => {
    // The load-bearing case of this whole migration. A streaming agent acks and
    // then never publishes a per-turn result, so waiting past the ack waits for
    // a message that never comes — the composer spun for 60s and then reported a
    // send failure for an answer the agent had already answered.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());

    await fake.emitControl(control({ status: "accepted", state: null }));

    const outcome = await promise;
    expect(outcome.event.status).toBe("accepted");
    expect(outcome.preserveDraft).toBe(false);
  });

  it("never resolves an unacked turn on its own", async () => {
    // There is deliberately NO timeout: a slow LLM turn must not synthesise a
    // phantom failure for a turn that is still being worked on. Only a refusal or
    // a room drop can end this wait.
    vi.useFakeTimers();
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    let settled = false;
    const promise = startTurn(result, TURN).then((outcome) => {
      settled = true;
      return outcome;
    });
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(settled).toBe(false);
    expect(result.current.pending).toBe(true);

    vi.useRealTimers();
    await fake.emitControl(control({ status: "accepted", state: null }));
    await promise;
    expect(settled).toBe(true);
  });

  it("ignores a routed `completed` that trails an already-settled turn", async () => {
    // The legacy routed agent still emits `completed` after its ack. That arrives
    // for a turn this hook has already handed back, so it must not resurrect a
    // waiter or throw — it is just the newest event.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());
    await fake.emitControl(control({ status: "accepted", seq: 1, state: null }));
    const outcome = await promise;
    expect(outcome.event.status).toBe("accepted");

    await fake.emitControl(control({ status: "completed", seq: 2 }));
    expect(result.current.lastEvent?.status).toBe("completed");
    await waitFor(() => expect(result.current.pending).toBe(false));
  });
});

describe("useInterviewChat — outcomes and the draft", () => {
  it("clears the draft on an ack, with no state to render from", async () => {
    // The native agent's ack carries no `state` at all. Clearing the editor is
    // driven by "the agent has your text", which is all it will ever say.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());
    await fake.emitControl(
      control({ status: "accepted", state: null, state_version: undefined }),
    );

    const outcome = await promise;
    expect(outcome.preserveDraft).toBe(false);
    expect(outcome.event.state).toBeNull();
  });

  it("still parses a routed completed payload verbatim", async () => {
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());
    await fake.emitControl(control({ status: "completed" }));

    const outcome = await promise;
    expect(outcome.preserveDraft).toBe(false);
    expect(outcome.event.stateVersion).toBe(7);
    // The next question comes through as the OBJECT the client renders the
    // next Question Card from — id included, not just a prompt string.
    expect(outcome.event.state?.next_question?.prompt_text).toBe("Next one?");
    expect(outcome.event.state?.next_question?.id).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
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

/** A well-formed session snapshot, as the backend's StateSnapshot.to_dict emits. */
function snapshotEvent(
  over: Record<string, unknown> = {},
  payload: Record<string, unknown> = {},
) {
  return {
    status: "snapshot",
    turn_key: null,
    seq: 1,
    turn_action: "answer",
    snapshot: {
      current_question_id: "44444444-4444-4444-4444-444444444444",
      current_question_text: "What does a covering index buy you?",
      question_number: 2,
      questions_remaining: 2,
      outcomes_covered: 1,
      outcomes_required: 3,
      is_finished: false,
      has_time_limit: true,
      time_remaining_seconds: 300,
      ...payload,
    },
    ...over,
  };
}

describe("useInterviewChat — session snapshots", () => {
  it("surfaces a snapshot on state and to onSnapshot, in arrival order", async () => {
    // One handler, two channels: registration is per-topic and the SDK throws on
    // a duplicate, so the snapshot feed has to be a fan-out from the same reader
    // the turn acks come through.
    const fake = makeFakeRoom();
    const seen: StateSnapshot[] = [];
    const { result } = renderHook(() =>
      useInterviewChat(fake.room, { onSnapshot: (s) => seen.push(s) }),
    );

    await fake.emitControl(snapshotEvent({ seq: 1 }));
    await fake.emitControl(
      snapshotEvent({ seq: 2 }, { question_number: 3, questions_remaining: 1 }),
    );

    expect(seen.map((s) => s.questionNumber)).toEqual([2, 3]);
    expect(result.current.snapshot?.questionNumber).toBe(3);
    expect(result.current.snapshot?.currentQuestionText).toBe(
      "What does a covering index buy you?",
    );
  });

  it("drops an out-of-order snapshot rather than rolling state backwards", async () => {
    // Both channels share one `seq`, and a reconnect can replay. Applying an older
    // snapshot would put the UI back on a question the interview has left.
    const fake = makeFakeRoom();
    const seen: StateSnapshot[] = [];
    const { result } = renderHook(() =>
      useInterviewChat(fake.room, { onSnapshot: (s) => seen.push(s) }),
    );

    await fake.emitControl(snapshotEvent({ seq: 5 }, { question_number: 4 }));
    await fake.emitControl(snapshotEvent({ seq: 2 }, { question_number: 1 }));

    expect(seen).toHaveLength(1);
    expect(result.current.snapshot?.questionNumber).toBe(4);
  });

  it("does not settle a pending turn", async () => {
    // Its turn_key is null: no turn owns it, so a snapshot arriving mid-turn must
    // leave the composer waiting for its ack.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    let settled = false;
    const promise = startTurn(result, TURN).then((outcome) => {
      settled = true;
      return outcome;
    });
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());

    await fake.emitControl(snapshotEvent({ seq: 1 }));
    expect(settled).toBe(false);
    expect(result.current.pending).toBe(true);

    await fake.emitControl(
      control({ status: "accepted", seq: 2, state: null }),
    );
    await promise;
    expect(settled).toBe(true);
  });

  it("shares the seq counter with turn acks", async () => {
    // A single counter for the whole topic. A turn ack at seq 4 must make a
    // snapshot at seq 3 stale, not just other snapshots.
    const fake = makeFakeRoom();
    const seen: StateSnapshot[] = [];
    const { result } = renderHook(() =>
      useInterviewChat(fake.room, { onSnapshot: (s) => seen.push(s) }),
    );

    const promise = startTurn(result, TURN);
    await waitFor(() => expect(fake.sendText).toHaveBeenCalled());
    await fake.emitControl(control({ status: "accepted", seq: 4, state: null }));
    await promise;

    await fake.emitControl(snapshotEvent({ seq: 3 }));
    expect(seen).toHaveLength(0);

    await fake.emitControl(snapshotEvent({ seq: 5 }));
    expect(seen).toHaveLength(1);
  });
});

describe("useInterviewChat — connected tracks every room state", () => {
  /**
   * `connected` is the only signal that the one transport is usable, so a state
   * this hook fails to notice leaves the composer writing typed turns onto a
   * channel that is not carrying them.
   */
  it.each([
    ConnectionState.Disconnected,
    ConnectionState.Reconnecting,
    ConnectionState.SignalReconnecting,
  ])("reports NOT connected in %s", async (state) => {
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));
    expect(result.current.connected).toBe(true);

    fake.setState(state);
    await waitFor(() => expect(result.current.connected).toBe(false));
  });

  it("reports NOT connected during signalReconnecting specifically", async () => {
    // Called out on its own because it is the one that hid: the SDK documents
    // it as "not noticeable to users most of the time" — media keeps flowing
    // and RoomEvent.Reconnecting never fires — so a hook subscribing only the
    // other four events kept reporting a stale `connected: true` while
    // `lk.chat` and the control topic were both down.
    const fake = makeFakeRoom();
    const { result } = renderHook(() => useInterviewChat(fake.room));

    fake.setState(ConnectionState.SignalReconnecting);
    await waitFor(() => expect(result.current.connected).toBe(false));
    expect(result.current.canSend).toBe(false);

    // ...and recovers when the signal channel comes back.
    fake.setState(ConnectionState.Connected);
    await waitFor(() => expect(result.current.connected).toBe(true));
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
