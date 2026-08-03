import { describe, expect, it } from "vitest";

import {
  ATTR_TURN_ACTION,
  ATTR_TURN_KEY,
  DEFAULT_TURN_ACTION,
  MAX_TEXT_CHARS,
  TOPIC_CHAT,
  TOPIC_CONTROL,
  TOPIC_TRANSCRIPTION,
  TURN_ACTIONS,
  chatAttributes,
  isTerminalStatus,
  isValidTurnKey,
  parseControlEvent,
  shouldPreserveDraft,
} from "../control-protocol";
import { newTurnKey } from "../turn-factory";

/**
 * These assert the CLIENT half of a contract whose server half lives in
 * `backend/.../realtime/text_protocol.py`. The constants are duplicated across
 * the two languages on purpose, so the pinning tests below are the tripwire for
 * a drift that would otherwise show up as turns rejected in production.
 */

function event(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    status: "completed",
    turn_key: "tk-abcdefgh",
    seq: 1,
    turn_action: "answer",
    ...overrides,
  });
}

describe("control-protocol topic + attribute names", () => {
  it("pins the topic names the agent publishes and reads", () => {
    // Changing either side without the other silently breaks the transport:
    // the agent would never see a turn, or the client would never see a result.
    expect(TOPIC_CHAT).toBe("lk.chat");
    expect(TOPIC_TRANSCRIPTION).toBe("lk.transcription");
    expect(TOPIC_CONTROL).toBe("abridge.interview.control");
  });

  it("pins the attribute names carrying turn_action and turn_key", () => {
    expect(ATTR_TURN_ACTION).toBe("turn_action");
    expect(ATTR_TURN_KEY).toBe("turn_key");
  });

  it("pins the full turn-action set the brain accepts", () => {
    // The backend rejects an unknown action rather than downgrading it, so a
    // value added there but not here becomes an unusable button.
    expect([...TURN_ACTIONS]).toEqual([
      "answer",
      "repeat",
      "clarify",
      "explain_term",
      "hint",
    ]);
    expect(DEFAULT_TURN_ACTION).toBe("answer");
  });

  it("pins the text cap to the server's validator", () => {
    expect(MAX_TEXT_CHARS).toBe(8_000);
  });
});

describe("isValidTurnKey", () => {
  it("accepts both shapes newTurnKey actually produces", () => {
    // The real generator, not a hand-written sample: this is what will be sent,
    // and a key the agent rejects costs the candidate a round-trip.
    for (let i = 0; i < 20; i += 1) {
      expect(isValidTurnKey(newTurnKey())).toBe(true);
    }
  });

  it("accepts the crypto.randomUUID shape", () => {
    expect(isValidTurnKey("f81d4fae-7dec-11d0-a765-00a0c91e6bf6")).toBe(true);
  });

  it("rejects keys that are too short or too long", () => {
    expect(isValidTurnKey("tk-1234")).toBe(false); // 7 chars
    expect(isValidTurnKey("a".repeat(129))).toBe(false);
    expect(isValidTurnKey("a".repeat(128))).toBe(true);
  });

  it("rejects characters outside the server's allowed set", () => {
    // A key is echoed into logs and persisted, so the shape is bounded.
    expect(isValidTurnKey("tk-abc def")).toBe(false);
    expect(isValidTurnKey("tk-abc/../x")).toBe(false);
    expect(isValidTurnKey("tk-abc\ndef")).toBe(false);
  });
});

describe("parseControlEvent", () => {
  it("parses a completed event with its structured state", () => {
    const parsed = parseControlEvent(
      event({
        status: "completed",
        state_version: 77,
        state: {
          // The full serialized InterviewSubmitAnswerResponse (the bridge
          // publishes from_step_result().model_dump(mode="json")).
          next_question: {
            id: "22222222-2222-2222-2222-222222222222",
            prompt_text: "What is an index?",
            question_type: "technical",
          },
          is_finished: false,
          ai_followup_text: null,
          time_remaining_seconds: 600,
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
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.status).toBe("completed");
    expect(parsed!.stateVersion).toBe(77);
    // The OBJECT, not a prompt string: the client builds its transcript turn id
    // from next_question.id and renders the held card from the object.
    expect(parsed!.state?.next_question?.prompt_text).toBe("What is an index?");
    expect(parsed!.state?.next_question?.id).toBe(
      "22222222-2222-2222-2222-222222222222",
    );
    expect(parsed!.state?.next_question?.question_type).toBe("technical");
    expect(parsed!.state?.is_finished).toBe(false);
    expect(parsed!.state?.time_remaining_seconds).toBe(600);
  });

  it("parses the transition fields a typed final answer carries", () => {
    // The typed-final-answer path: a closing transition must survive the parse
    // so the client can run the same closing sequence REST would trigger.
    const parsed = parseControlEvent(
      event({
        state: {
          next_question: null,
          is_finished: true,
          ai_followup_text: null,
          time_remaining_seconds: 0,
          ai_turn_text: null,
          language: "en",
          should_narrate: null,
          should_await_response: null,
          should_finish: true,
          assistance_kind: null,
          pending_confirmation: false,
          interaction_state: "awaiting_end_confirmation",
          transition_id: "transition:tk-1:end",
          transition_text: "That concludes the interview.",
          transition_target: "closing",
        },
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.state?.is_finished).toBe(true);
    expect(parsed!.state?.should_finish).toBe(true);
    expect(parsed!.state?.transition_target).toBe("closing");
    expect(parsed!.state?.transition_text).toBe("That concludes the interview.");
    expect(parsed!.state?.next_question).toBeNull();
  });

  it("reads the brain's state_version separately from the stream seq", () => {
    // Two different counters: seq orders the control stream, state_version
    // identifies interview state. Conflating them would reconcile against the
    // wrong number.
    const parsed = parseControlEvent(event({ seq: 3, state_version: 77 }));
    expect(parsed!.seq).toBe(3);
    expect(parsed!.stateVersion).toBe(77);
  });

  it("leaves state_version null when the agent omits it", () => {
    // accepted/rejected fire BEFORE the brain runs, so they have no version.
    const parsed = parseControlEvent(event({ status: "accepted" }));
    expect(parsed!.stateVersion).toBeNull();
  });

  it("parses a rejection with its reason", () => {
    const parsed = parseControlEvent(
      event({ status: "rejected", rejection: "turn_in_flight" }),
    );
    expect(parsed!.status).toBe("rejected");
    expect(parsed!.rejection).toBe("turn_in_flight");
  });

  it("parses a failure with only the error class", () => {
    const parsed = parseControlEvent(
      event({ status: "failed", error_class: "TimeoutError" }),
    );
    expect(parsed!.status).toBe("failed");
    expect(parsed!.errorClass).toBe("TimeoutError");
  });

  it("returns null rather than throwing on malformed JSON", () => {
    // This runs inside a LiveKit stream handler: throwing would tear down the
    // room over one bad frame, which is far worse than dropping the event.
    expect(parseControlEvent("not json")).toBeNull();
    expect(parseControlEvent("")).toBeNull();
    expect(parseControlEvent("null")).toBeNull();
    expect(parseControlEvent("[1,2,3]")).toBeNull();
    expect(parseControlEvent('"a string"')).toBeNull();
  });

  it("rejects an unknown status instead of guessing", () => {
    // An unrecognised status must not be treated as terminal — that would
    // release the composer on an event we do not understand.
    expect(parseControlEvent(event({ status: "queued" }))).toBeNull();
    expect(parseControlEvent(event({ status: 7 }))).toBeNull();
  });

  it("rejects a non-integer seq", () => {
    // seq drives a monotonic comparison; a float or NaN silently breaks
    // stale-event detection.
    expect(parseControlEvent(event({ seq: 1.5 }))).toBeNull();
    expect(parseControlEvent(event({ seq: "2" }))).toBeNull();
    expect(parseControlEvent(event({ seq: undefined }))).toBeNull();
  });

  it("falls back to the default action on an unknown turn_action", () => {
    // Inbound direction only: this is the agent's own echo, already validated
    // server-side, so an unexpected value is a display concern, not a grading
    // one — unlike the OUTBOUND direction, where the server rejects.
    const parsed = parseControlEvent(event({ turn_action: "sing" }));
    expect(parsed!.turnAction).toBe("answer");
  });

  it("tolerates a missing state object", () => {
    const parsed = parseControlEvent(event({ state: undefined }));
    expect(parsed!.state).toBeNull();
  });

  it("coerces a malformed state rather than trusting it", () => {
    // A state whose is_finished is absent must not read as finished — that
    // would end a live interview. A mistyped next_question must degrade to null
    // rather than poison the held Question Card.
    const parsed = parseControlEvent(
      event({ state: { next_question: 5, is_finished: "yes" } }),
    );
    expect(parsed!.state?.is_finished).toBe(false);
    expect(parsed!.state?.next_question).toBeNull();
  });
});

describe("turn lifecycle helpers", () => {
  it("treats only accepted as non-terminal", () => {
    // The composer must stay pending on `accepted` and release on the rest;
    // getting this backwards either hangs the editor or unlocks it too early.
    expect(isTerminalStatus("accepted")).toBe(false);
    expect(isTerminalStatus("completed")).toBe(true);
    expect(isTerminalStatus("rejected")).toBe(true);
    expect(isTerminalStatus("failed")).toBe(true);
  });

  it("preserves the draft on rejected and failed only", () => {
    // A rejected turn was never graded and a failed one is retryable with the
    // same turn_key, so both keep what the candidate typed. Clearing it would
    // lose a long answer to a transient error.
    expect(shouldPreserveDraft("rejected")).toBe(true);
    expect(shouldPreserveDraft("failed")).toBe(true);
    expect(shouldPreserveDraft("completed")).toBe(false);
    expect(shouldPreserveDraft("accepted")).toBe(false);
  });
});

describe("chatAttributes", () => {
  it("emits exactly the two attribute keys the agent validates", () => {
    const attrs = chatAttributes({ turnAction: "hint", turnKey: "tk-abcdefgh" });
    expect(attrs).toEqual({
      turn_action: "hint",
      turn_key: "tk-abcdefgh",
    });
  });

  it("carries no session or student identity", () => {
    // SECURITY: the agent takes session_id/student_id from its dispatch
    // metadata and ignores anything client-sent. Adding them here would imply
    // the client is trusted for identity.
    const attrs = chatAttributes({
      turnAction: "answer",
      turnKey: newTurnKey(),
    });
    expect(Object.keys(attrs).sort()).toEqual(["turn_action", "turn_key"]);
  });
});
