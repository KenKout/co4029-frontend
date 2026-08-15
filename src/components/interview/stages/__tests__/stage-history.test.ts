import { describe, expect, it } from "vitest";

import { stageHistoryTurns } from "../helpers";
import type { ConversationTurn } from "@/lib/interview/types";

const ai = (
  id: string,
  text: string,
  elapsedSeconds: number,
  extra: Partial<ConversationTurn> = {},
): ConversationTurn => ({
  id,
  role: "ai",
  text,
  elapsedSeconds,
  ...extra,
});
const user = (
  id: string,
  text: string,
  elapsedSeconds: number,
): ConversationTurn => ({
  id,
  role: "user",
  text,
  elapsedSeconds,
  kind: "answer",
});

const question = ai("q1", "What is the primary difference?", 3, {
  kind: "question",
});

describe("stageHistoryTurns", () => {
  it("interleaves the agent's live speech with committed turns by time", () => {
    // Reported bug: a follow-up from question one rendered BELOW question two,
    // because live turns were appended instead of ordered.
    const history = stageHistoryTurns(
      [
        ai("t0", "Let's begin.", 0, { kind: "transition" }),
        user("a1", "I'm not sure", 42),
      ],
      null,
      null,
      {
        liveTurns: [
          ai("agent-s2", "That's okay — let me rephrase.", 46, { live: true }),
        ],
        agentSpeaks: true,
      },
    );

    expect(history.map((turn) => turn.elapsedSeconds)).toEqual([0, 42, 46]);
  });

  it("hides the agent reading the question the card is showing", () => {
    // The agent voices each question, so its utterance also arrives as
    // transcription. Both rendered = the question twice on one screen.
    const history = stageHistoryTurns([question], question, null, {
      liveTurns: [
        ai("agent-s1", "What is the primary difference?", 2, { live: true }),
      ],
      agentSpeaks: true,
    });

    expect(history).toEqual([]);
  });

  it("keeps the agent re-reading the question after a rejoin", () => {
    // A re-read ("Let me repeat the question: …") is a deliberate second
    // utterance, not the first reading, so it must stay visible instead of
    // being deduplicated against the pinned question the moment it finishes.
    const history = stageHistoryTurns([question], question, null, {
      liveTurns: [
        ai(
          "agent-sr",
          "Let me repeat the question: What is the primary difference?",
          15,
          { live: true },
        ),
      ],
      agentSpeaks: true,
    });

    expect(history.map((turn) => turn.id)).toEqual(["agent-sr"]);
  });

  it("keeps the Vietnamese re-read lead-in too", () => {
    const history = stageHistoryTurns([question], question, null, {
      liveTurns: [
        ai(
          "agent-sr-vi",
          "Để tôi nhắc lại câu hỏi: What is the primary difference?",
          15,
          { live: true },
        ),
      ],
      agentSpeaks: true,
    });

    expect(history.map((turn) => turn.id)).toEqual(["agent-sr-vi"]);
  });

  it("keeps a follow-up once the candidate has answered that question", () => {
    const history = stageHistoryTurns(
      [question, user("a1", "I'm not sure", 42)],
      question,
      null,
      {
        liveTurns: [
          ai("agent-s2", "That's okay — let me rephrase.", 46, { live: true }),
        ],
        agentSpeaks: true,
      },
    );

    expect(history.map((turn) => turn.text)).toEqual([
      "I'm not sure",
      "That's okay — let me rephrase.",
    ]);
  });

  it("keeps hiding the question reading after the candidate has answered it", () => {
    // Reported: the card's own question reappeared as a FOLLOW-UP once an answer
    // existed, because suppression stopped at the first answer instead of being
    // scoped to the question's own window.
    const history = stageHistoryTurns(
      [question, user("a1", "Hmm can you tell me more ?", 13)],
      question,
      null,
      {
        liveTurns: [
          ai("agent-s1", "What is the primary difference?", 2, { live: true }),
          ai("agent-s2", "Sure! Think about day-to-day handling…", 17, {
            live: true,
          }),
        ],
        agentSpeaks: true,
      },
    );

    expect(history.map((turn) => turn.id)).toEqual(["a1", "agent-s2"]);
  });

  it("drops committed AI turns the live agent voiced, so no paraphrase duplicates", () => {
    // The agent paraphrases: "Thanks, Duy. Now, imagine…" never prefix-matches
    // the bank text, so text-based dedupe cannot pair them.
    const previous = ai(
      "q0",
      "Imagine a company that stores customer data.",
      10,
      {
        kind: "question",
      },
    );
    const history = stageHistoryTurns([previous], null, null, {
      liveTurns: [
        ai("agent-s9", "Thanks, Duy. Now, imagine a company that stores…", 11, {
          live: true,
        }),
      ],
      agentSpeaks: true,
    });

    expect(history.map((turn) => turn.id)).toEqual(["agent-s9"]);
  });

  it("labels the agent's live speech after the answer as a follow-up", () => {
    const history = stageHistoryTurns(
      [question, user("a1", "I'm not sure", 42)],
      question,
      null,
      {
        liveTurns: [
          ai("agent-s2", "That's okay — let me rephrase.", 46, { live: true }),
        ],
        agentSpeaks: true,
      },
    );

    expect(history[history.length - 1]?.kind).toBe("followup");
  });

  it("does not call a previous question's reading a follow-up", () => {
    // Reported: every live utterance carried a violet FOLLOW-UP badge, including
    // the agent reading a brand-new bank question, because the kind was hardcoded
    // where no turn identity exists. Only the stage can tell the two apart.
    const second = ai("q2", "And when would it not help?", 30, {
      kind: "question",
    });
    const history = stageHistoryTurns([second], second, null, {
      liveTurns: [ai("agent-s0", "What is an index?", 2, { live: true })],
      agentSpeaks: true,
    });

    expect(history.map((turn) => turn.id)).toEqual(["agent-s0"]);
    expect(history[0]?.kind).toBeUndefined();
  });

  it("keeps committed AI turns when no agent is in the room", () => {
    const history = stageHistoryTurns([question], null, null, {
      agentSpeaks: false,
    });
    expect(history.map((turn) => turn.id)).toEqual(["q1"]);
  });
});
