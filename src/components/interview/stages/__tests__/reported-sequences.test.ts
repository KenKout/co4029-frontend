import { describe, expect, it } from "vitest";

import { stageHistoryTurns } from "../helpers";
import type { ConversationTurn } from "@/lib/interview/types";

/**
 * Sequences taken from reported screenshots, not from what the code looks like it
 * does. Each one failed before the fix it pins.
 */
const Q1 = "What is the primary difference between operational processing and information processing in an organizational context?";
const Q2 = "Imagine a company that stores customer data in a CRM, sales data in an ERP, and website logs in a cloud bucket. They are struggling to get a unified view of customer behavior. How would the implementation of a data warehouse solve this specific problem?";

const card = (text: string, elapsedSeconds: number, id = `q-${elapsedSeconds}`): ConversationTurn => ({
  id, role: "ai", text, kind: "question", elapsedSeconds,
});
const answer = (text: string, elapsedSeconds: number | undefined, id: string): ConversationTurn => ({
  id, role: "user", text, kind: "answer", elapsedSeconds,
});
const said = (text: string, elapsedSeconds: number, id: string): ConversationTurn => ({
  id, role: "ai", text, live: true, elapsedSeconds,
});

describe("what the interviewer said reaches the transcript", () => {
  it("shows the agent's paraphrase of the CURRENT question immediately", () => {
    // Reported: "lúc đầu khi ai nói câu hỏi -> thì history không có hiện câu đó",
    // and it only appeared after advancing. A paraphrase is a different sentence
    // from the card, so it belongs on screen the moment it is spoken.
    const cardTurn = card(Q2, 60, "q2");
    const transcript = [card(Q1, 0, "q1"), answer("The two sides are...", 55, "a1"), cardTurn];
    const paraphrase = said("Thanks for breaking that down. Now, imagine a company that stores customer data in a CRM, and they're really struggling. How would implementing a data warehouse solve that?", 63, "s2");

    const history = stageHistoryTurns(transcript, cardTurn, null, {
      liveTurns: [paraphrase],
      agentSpeaks: true,
    });

    expect(history.find((t) => t.id === "s2")).toBeDefined();
    expect(history.find((t) => t.id === "s2")?.kind).toBeUndefined();
  });

  it("drops a verbatim re-reading and keeps the stored wording instead", () => {
    const cardTurn = card(Q1, 0, "q1");
    const history = stageHistoryTurns([cardTurn], cardTurn, null, {
      liveTurns: [said(Q1, 3, "s1")],
      agentSpeaks: true,
    });

    expect(history).toEqual([]);
  });

  it("never labels the first question a follow-up because of the onboarding reply", () => {
    const cardTurn = card(Q1, 0, "q1");
    const transcript = [answer("I'm ready to begin.", undefined, "ob"), cardTurn];
    const history = stageHistoryTurns(transcript, cardTurn, null, {
      liveTurns: [said("Right — here's your first question, phrased my way.", 2, "s1")],
      agentSpeaks: true,
    });

    expect(history.find((t) => t.id === "s1")?.kind).toBeUndefined();
  });
});

describe("follow-up badges stay put as the interview advances", () => {
  const q1Turn = card(Q1, 0, "q1");
  const q2Turn = card(Q2, 60, "q2");
  const probe = said("No problem at all. Let's break it down: how do those two types of processing differ?", 22, "s-probe");
  const transcript = [
    q1Turn,
    answer("I'm not quite understand ?", 19, "a-ask"),
    answer("The two sides are...", 55, "a1"),
    q2Turn,
  ];

  it("labels a probe on question one while question one is live", () => {
    const history = stageHistoryTurns([q1Turn, answer("I'm not quite understand ?", 19, "a-ask")], q1Turn, null, {
      liveTurns: [probe],
      agentSpeaks: true,
    });

    expect(history.find((t) => t.id === "s-probe")?.kind).toBe("followup");
  });

  it("KEEPS that badge after the interview moves to question two", () => {
    // Reported: "sau khi tôi hoàn thành câu hỏi 1, nó chuyển qua câu hỏi hai" and
    // the follow-up re-rendered "trắng nhách" — plain, untagged. The kind was
    // recomputed against the pinned card, so history was reclassified.
    const history = stageHistoryTurns(transcript, q2Turn, null, {
      liveTurns: [probe],
      agentSpeaks: true,
    });

    expect(history.find((t) => t.id === "s-probe")?.kind).toBe("followup");
  });

  it("labels a reply to a clarification request as a clarification", () => {
    const ask: ConversationTurn = { id: "c1", role: "user", text: "Ask for clarification", kind: "clarification", elapsedSeconds: 19 };
    const history = stageHistoryTurns([q1Turn, ask], q1Turn, null, {
      liveTurns: [said("Sure — think of it this way.", 21, "s-c")],
      agentSpeaks: true,
    });

    expect(history.find((t) => t.id === "s-c")?.kind).toBe("clarification");
  });
});

describe("resuming after F5", () => {
  it("keeps the interviewer's restored turns — they have no live transcription", () => {
    const restored = (id: string, text: string, kind: ConversationTurn["kind"], elapsedSeconds: number): ConversationTurn => ({
      id, role: "ai", text, kind, elapsedSeconds, restored: true,
    });
    const cardTurn = restored("m4", "Building on that, how does a warehouse help?", "followup", 225);
    const transcript: ConversationTurn[] = [
      restored("q1", Q1, "question", 0),
      { ...answer("The two sides are...", 155, "a1"), restored: true },
      restored("q2", Q2, "question", 160),
      { ...answer("A data warehouse would...", 213, "a2"), restored: true },
      cardTurn,
    ];

    const history = stageHistoryTurns(transcript, cardTurn, null, { liveTurns: [], agentSpeaks: true });

    expect(history.map((t) => t.id)).toEqual(["q1", "a1", "q2", "a2"]);
  });
});
