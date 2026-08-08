/**
 * Contract join test: the EXACT bytes the Python agent emits, parsed by this client.
 *
 * Every other test on both sides builds its own fixture, so both can agree with
 * themselves and still disagree with each other. These strings are captured
 * verbatim from `text_protocol.ControlEvent.to_json()` — if a field is renamed on
 * either side, this is the test that fails.
 */
import { describe, expect, it } from "vitest";

import { parseControlEvent } from "@/lib/interview/control-protocol";

// Captured from the backend: see
// backend/abridgeai/features/interviews/realtime/text_protocol.py
const WIRE = {
  ack: '{"seq":7,"status":"accepted","turn_action":"answer","turn_key":"tk-abcd1234"}',
  reject:
    '{"rejection":"session_closing","seq":8,"status":"rejected","turn_action":"hint","turn_key":"tk-abcd1234"}',
  snapshotTimed:
    '{"seq":9,"snapshot":{"current_question_id":"3f2a1b4c-0000-4000-8000-000000000001","current_question_text":"What is a covering index?","has_time_limit":true,"is_finished":false,"outcomes_covered":1,"outcomes_required":2,"question_number":2,"questions_remaining":3,"questions_total":5,"time_remaining_seconds":540},"status":"snapshot","turn_action":"answer","turn_key":null}',
  snapshotUntimed:
    '{"seq":10,"snapshot":{"current_question_id":null,"current_question_text":null,"has_time_limit":false,"is_finished":true,"outcomes_covered":2,"outcomes_required":2,"question_number":0,"questions_remaining":0,"questions_total":3,"time_remaining_seconds":null},"status":"snapshot","turn_action":"answer","turn_key":null}',
} as const;

describe("agent wire format", () => {
  it("parses a real ack, which is what settles a typed turn", () => {
    const event = parseControlEvent(WIRE.ack);
    expect(event).not.toBeNull();
    expect(event?.status).toBe("accepted");
    expect(event?.turnKey).toBe("tk-abcd1234");
    expect(event?.seq).toBe(7);
  });

  it("parses a real rejection, carrying the reason and the correlating key", () => {
    const event = parseControlEvent(WIRE.reject);
    expect(event?.status).toBe("rejected");
    expect(event?.rejection).toBe("session_closing");
    expect(event?.turnAction).toBe("hint");
    expect(event?.turnKey).toBe("tk-abcd1234");
  });

  it("parses a real timed snapshot with every field mapped", () => {
    const event = parseControlEvent(WIRE.snapshotTimed);
    expect(event?.status).toBe("snapshot");
    expect(event?.turnKey).toBeNull();
    expect(event?.snapshot).toEqual({
      currentQuestionId: "3f2a1b4c-0000-4000-8000-000000000001",
      currentQuestionText: "What is a covering index?",
      questionNumber: 2,
      questionsRemaining: 3,
      questionsTotal: 5,
      outcomesCovered: 1,
      outcomesRequired: 2,
      isFinished: false,
      hasTimeLimit: true,
      timeRemainingSeconds: 540,
    });
  });

  it("keeps untimed distinguishable from a dropped field", () => {
    // The whole reason `has_time_limit` exists. Reading `timeRemainingSeconds:
    // null` as "untimed" without checking this flag is how the session timer
    // died silently before.
    const event = parseControlEvent(WIRE.snapshotUntimed);
    expect(event?.snapshot?.hasTimeLimit).toBe(false);
    expect(event?.snapshot?.timeRemainingSeconds).toBeNull();
    expect(event?.snapshot?.isFinished).toBe(true);
  });
});
