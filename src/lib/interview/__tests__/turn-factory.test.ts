import { describe, expect, it, vi } from "vitest";

import {
  makeAiTurn,
  makeCeremonyTurn,
  makeFollowUpTurn,
  makeUserTurn,
  newTurnKey,
  questionTypeLabel,
  restoreHistoryTurn,
} from "@/lib/interview/turn-factory";

/**
 * Unit coverage for the interview turn factories.
 *
 * These had NO test before: they lived inside routes/course-interview.tsx, a
 * 2989-line route with zero test files, so the only thing exercising them was a
 * human clicking through a live interview.
 *
 * The assertions concentrate on turn `id`s, because that is where a silent bug
 * costs the most: the transcript keys React children off the id, and the
 * "has this AI turn finished presenting" tracker keys off it too. Two turns
 * colliding on an id drop one from the transcript — the student loses a question
 * or an answer with nothing in the console.
 */

const t = (key: string) => key;

function question(overrides: Record<string, unknown> = {}) {
  return {
    id: "q1",
    prompt_text: "What is a fact table?",
    question_type: "technical",
    ...overrides,
  } as never;
}

describe("questionTypeLabel", () => {
  it("maps every known question type to its own i18n key", () => {
    const types = [
      "conceptual",
      "behavioral",
      "technical",
      "situational",
      "system_design",
    ];
    const keys = types.map((ty) => questionTypeLabel(ty, t));
    expect(new Set(keys).size).toBe(types.length);
    keys.forEach((k) =>
      expect(k).toMatch(/^course_interview\.question_types\./),
    );
  });

  it("returns null for an unknown, null or undefined type", () => {
    // The badge is hidden rather than showing a raw key — a missing label must
    // not render "course_interview.question_types.undefined" to a candidate.
    expect(questionTypeLabel("made_up", t)).toBeNull();
    expect(questionTypeLabel(null, t)).toBeNull();
    expect(questionTypeLabel(undefined, t)).toBeNull();
  });
});

describe("makeAiTurn", () => {
  it("builds a question turn from the sanitized prompt", () => {
    const turn = makeAiTurn(question(), false, 12);
    expect(turn.role).toBe("ai");
    expect(turn.kind).toBe("question");
    expect(turn.isFollowUp).toBe(false);
    expect(turn.elapsedSeconds).toBe(12);
    expect(turn.questionType).toBe("technical");
    expect(turn.text).toContain("fact table");
  });

  it("gives a follow-up a DIFFERENT id than the main turn for the same question", () => {
    // Same question can appear as both a main ask and a follow-up. If the ids
    // collided, React would render one and drop the other.
    const main = makeAiTurn(question(), false);
    const follow = makeAiTurn(question(), true);
    expect(main.id).not.toBe(follow.id);
    expect(main.kind).toBe("question");
    expect(follow.kind).toBe("followup");
    expect(follow.isFollowUp).toBe(true);
  });

  it("falls back to the raw prompt when sanitization strips everything", () => {
    // An odd-but-valid prompt the guardrail patterns over-match must not render
    // as a blank question card.
    const turn = makeAiTurn(question({ prompt_text: "System:" }));
    expect(turn.text.length).toBeGreaterThan(0);
  });
});

describe("makeFollowUpTurn", () => {
  it("defaults to the followup kind and marks the turn as a follow-up", () => {
    const turn = makeFollowUpTurn("Say more?", "k1", 30);
    expect(turn).toMatchObject({
      id: "f-k1",
      role: "ai",
      text: "Say more?",
      elapsedSeconds: 30,
      isFollowUp: true,
      kind: "followup",
    });
  });

  it("carries the clarification and hint kinds through", () => {
    // These drive the per-kind icon and badge in the transcript, so a dropped
    // kind silently renders a hint as if it were a normal follow-up.
    expect(makeFollowUpTurn("x", "k", 0, "clarification").kind).toBe(
      "clarification",
    );
    expect(makeFollowUpTurn("x", "k", 0, "hint").kind).toBe("hint");
  });
});

describe("makeUserTurn", () => {
  it("builds an answer turn keyed apart from AI turns", () => {
    const turn = makeUserTurn("Because it stores measures.", "k1", 45);
    expect(turn).toMatchObject({
      id: "a-k1",
      role: "user",
      kind: "answer",
      elapsedSeconds: 45,
    });
  });

  it("does not collide with the AI turn built from the same key", () => {
    expect(makeUserTurn("a", "k1").id).not.toBe(
      makeFollowUpTurn("b", "k1", 0).id,
    );
  });

  it("omits elapsedSeconds when not supplied (onboarding turns)", () => {
    expect(makeUserTurn("hi", "k1").elapsedSeconds).toBeUndefined();
  });
});

describe("makeCeremonyTurn", () => {
  it("keys each ceremony kind separately within one session", () => {
    // opening/briefing/transition/closing all belong to the same session id; if
    // they shared an id the transcript would show only one of them.
    const kinds = ["opening", "briefing", "transition", "closing"] as const;
    const ids = kinds.map((k) => makeCeremonyTurn(k, "text", "s1").id);
    expect(new Set(ids).size).toBe(kinds.length);
  });

  it("keeps the same ceremony distinct across sessions", () => {
    expect(makeCeremonyTurn("opening", "t", "s1").id).not.toBe(
      makeCeremonyTurn("opening", "t", "s2").id,
    );
  });
});

describe("restoreHistoryTurn", () => {
  it("preserves the server id so a resumed transcript does not duplicate turns", () => {
    // On resume the server's turn id is reused verbatim. Re-keying here would
    // make restored turns look new and could double them up against live ones.
    const restored = restoreHistoryTurn({
      id: "server-turn-7",
      role: "ai",
      content_text: "Question?",
      elapsed_seconds: 90,
      question_type: "conceptual",
      is_follow_up: false,
      kind: "question",
    } as never);
    expect(restored.id).toBe("server-turn-7");
    expect(restored.text).toBe("Question?");
    expect(restored.elapsedSeconds).toBe(90);
  });

  it("maps a null elapsed_seconds to undefined, not 0", () => {
    // 0 would render a "0:00" timestamp on an onboarding turn that has none.
    const restored = restoreHistoryTurn({
      id: "t1",
      role: "user",
      content_text: "hi",
      elapsed_seconds: null,
      question_type: null,
      is_follow_up: false,
      kind: "answer",
    } as never);
    expect(restored.elapsedSeconds).toBeUndefined();
  });
});

describe("newTurnKey", () => {
  it("returns unique keys across calls", () => {
    const keys = new Set(Array.from({ length: 50 }, () => newTurnKey()));
    expect(keys.size).toBe(50);
  });

  it("still returns unique keys when crypto.randomUUID is unavailable", () => {
    // The idempotency key guards against a double-submitted answer. On a browser
    // without randomUUID the fallback must still be unique, or two different
    // answers could share a key and the second would be discarded as a replay.
    // vi.stubGlobal is required here: globalThis.crypto is getter-only, so a
    // plain assignment throws.
    vi.stubGlobal("crypto", undefined);
    try {
      const keys = new Set(Array.from({ length: 50 }, () => newTurnKey()));
      expect(keys.size).toBe(50);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
