import { describe, expect, it } from "vitest";

import type { ConversationTurn } from "@/components/interview/interview-workspace";
import {
  visibleTranscriptCount,
  visibleTranscriptTurns,
} from "@/lib/interview/transcript-visibility";

function ai(id: string, text = `ai ${id}`): ConversationTurn {
  return { id, role: "ai", text, kind: "question" };
}

function user(id: string): ConversationTurn {
  return { id, role: "user", text: `answer ${id}`, kind: "answer" };
}

const NONE: ReadonlySet<string> = new Set<string>();

describe("visibleTranscriptTurns", () => {
  it("hides the newest AI turn until it has been presented", () => {
    const transcript = [ai("q1"), user("a1"), ai("q2")];
    const visible = visibleTranscriptTurns(transcript, new Set(["q1"]));
    expect(visible.map((turn) => turn.id)).toEqual(["q1", "a1"]);
  });

  it("shows the newest AI turn once presented", () => {
    const transcript = [ai("q1"), user("a1"), ai("q2")];
    const visible = visibleTranscriptTurns(transcript, new Set(["q1", "q2"]));
    expect(visible.map((turn) => turn.id)).toEqual(["q1", "a1", "q2"]);
  });

  it("keeps restored history visible even though none of it was presented", () => {
    // A resumed session replays server history that never went through the
    // presentation lifecycle. Filtering every unpresented AI turn would blank
    // the transcript; only the LAST AI turn may be withheld.
    const transcript = [ai("q1"), user("a1"), ai("q2"), user("a2"), ai("q3")];
    const visible = visibleTranscriptTurns(transcript, NONE);
    expect(visible.map((turn) => turn.id)).toEqual(["q1", "a1", "q2", "a2"]);
  });

  it("hides an unpresented AI turn that is not last in the array", () => {
    // Optimistic user turns can land after the AI turn that triggered them.
    const transcript = [ai("q1"), ai("q2"), user("a2")];
    const visible = visibleTranscriptTurns(transcript, new Set(["q1"]));
    expect(visible.map((turn) => turn.id)).toEqual(["q1", "a2"]);
  });

  it("never hides a user turn", () => {
    const transcript = [user("a1"), user("a2")];
    expect(visibleTranscriptTurns(transcript, NONE)).toEqual(transcript);
  });

  it("returns the same reference when nothing is hidden", () => {
    const transcript = [ai("q1")];
    expect(visibleTranscriptTurns(transcript, new Set(["q1"]))).toBe(
      transcript,
    );
  });

  it("handles an empty transcript", () => {
    const transcript: ConversationTurn[] = [];
    expect(visibleTranscriptTurns(transcript, NONE)).toBe(transcript);
  });

  it("hides a lone unpresented AI turn (the very first question)", () => {
    expect(visibleTranscriptTurns([ai("q1")], NONE)).toEqual([]);
  });
});

describe("visibleTranscriptCount", () => {
  it("agrees with the rendered list, so the badge cannot lead the turn", () => {
    const transcript = [ai("q1"), user("a1"), ai("q2")];
    const presented = new Set(["q1"]);
    expect(visibleTranscriptCount(transcript, presented)).toBe(
      visibleTranscriptTurns(transcript, presented).length,
    );
    expect(visibleTranscriptCount(transcript, presented)).toBe(2);
  });

  it("counts the turn once it is presented", () => {
    const transcript = [ai("q1"), user("a1"), ai("q2")];
    expect(visibleTranscriptCount(transcript, new Set(["q1", "q2"]))).toBe(3);
  });
});
