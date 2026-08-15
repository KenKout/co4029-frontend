import { describe, expect, it, vi } from "vitest";

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
    // from the card, so it belongs on screen the moment it is spoken. The kind
    // comes from the server's `agent_action: question` marker (assigned in
    // WorkspaceStage before this function sees it).
    const cardTurn = card(Q2, 60, "q2");
    const transcript = [card(Q1, 0, "q1"), answer("The two sides are...", 55, "a1"), cardTurn];
    const paraphrase = { ...said("Thanks for breaking that down. Now, imagine a company that stores customer data in a CRM, and they're really struggling. How would implementing a data warehouse solve that?", 63, "s2"), kind: "question" as const };

    const history = stageHistoryTurns(transcript, cardTurn, null, {
      liveTurns: [paraphrase],
      agentSpeaks: true,
    });

    expect(history.find((t) => t.id === "s2")).toBeDefined();
    // The server's question marker is authoritative — never re-badged.
    expect(history.find((t) => t.id === "s2")?.kind).toBe("question");
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
  const restored = (id: string, text: string, kind: ConversationTurn["kind"], elapsedSeconds: number): ConversationTurn => ({
    id, role: "ai", text, kind, elapsedSeconds, restored: true,
  });
  const followUp = restored("m4", "Building on that, how does a warehouse help?", "followup", 225);
  const q2Turn = restored("q2", Q2, "question", 160);
  const transcript: ConversationTurn[] = [
    restored("q1", Q1, "question", 0),
    { ...answer("The two sides are...", 155, "a1"), restored: true },
    q2Turn,
    { ...answer("A data warehouse would...", 213, "a2"), restored: true },
    followUp,
  ];

  it("keeps the restored follow-up in the conversation — the card is the question", () => {
    // Reported: after a reload the newest restored follow-up was promoted to
    // the pinned card, so it vanished from the conversation and read as a
    // numbered question. The card must be the live QUESTION; the follow-up is
    // a conversation line beneath it.
    const history = stageHistoryTurns(transcript, q2Turn, null, { liveTurns: [], agentSpeaks: true });

    expect(history.map((t) => t.id)).toEqual(["q1", "a1", "a2", "m4"]);
  });
});

describe("the card does not animate against the agent's voice", () => {
  it("shows the whole question at once and unlocks straight away", async () => {
    // The interviewer paraphrases every question — it opens in its own words and
    // bridges from the previous answer — so the card's text is never the sentence
    // being spoken. Animating it against that playout is what produced "it goes
    // silent until the question is fully on screen, then reads it fast".
    const { render, screen } = await import("@testing-library/react");
    const { QuestionCardPrompt } = await import("../QuestionCardPrompt");
    const onPresentationComplete = vi.fn();
    const onSpeakingChange = vi.fn();

    render(
      <QuestionCardPrompt
        turn={{ id: "q1", role: "ai", text: Q1, kind: "question", elapsedSeconds: 0 }}
        animate
        speak={(() => undefined)}
        agentSpeaks
        onSpeakingChange={onSpeakingChange}
        onPresentationComplete={onPresentationComplete}
      />,
    );

    expect(screen.getByText(Q1)).toBeTruthy();
    expect(onPresentationComplete).toHaveBeenCalledTimes(1);
    expect(onSpeakingChange).toHaveBeenLastCalledWith(false);
  });
});

describe("the interviewer reading a NEW question", () => {
  it("keeps the server's question marker through the labeler", () => {
    // Reported: advancing to question three stamped the spoken question with a
    // violet FOLLOW-UP badge. The committed question turn is timestamped when
    // the client applied the snapshot, so the paraphrase that began earlier
    // used to anchor one question back. The server now announces the beat
    // (`agent_action: question`) and the stage pre-tags the segment; the
    // labeler must not second-guess it.
    const cardTurn = card(Q2, 65, "q2");
    const transcript = [
      card(Q1, 0, "q1"),
      answer("I'm not quite understand ?", 19, "a-ask"),
      answer("Still stuck", 43, "a2"),
      cardTurn,
    ];
    // A loose paraphrase: shares no exact substring with the bank text, so the
    // verbatim-dedup path cannot absorb it — only the kind marker can place it.
    const paraphrase = {
      ...said(
        "Thanks for breaking that down. Now picture one company: CRM data here, ERP data there, logs in a bucket — and no unified view of the customer. Walk me through how a warehouse fixes that.",
        64,
        "s-q2",
      ),
      kind: "question" as const,
    };

    const history = stageHistoryTurns(transcript, cardTurn, null, {
      liveTurns: [paraphrase],
      agentSpeaks: true,
    });

    expect(history.find((t) => t.id === "s-q2")?.kind).toBe("question");
  });

  it("still labels an unannounced probe that follows an answer", () => {
    const cardTurn = card(Q2, 65, "q2");
    const transcript = [
      card(Q1, 0, "q1"),
      answer("No idea", 42, "a1"),
      cardTurn,
      answer("A warehouse stores history", 80, "a2"),
    ];
    const probe = said("Right — and what does storing history give you?", 85, "s-p");

    const history = stageHistoryTurns(transcript, cardTurn, null, {
      liveTurns: [probe],
      agentSpeaks: true,
    });

    expect(history.find((t) => t.id === "s-p")?.kind).toBe("followup");
  });
});

describe("rejoining mid-question", () => {
  it("does not duplicate the pinned question with the re-read utterance", () => {
    // The agent re-states the question after a rejoin ("Let me repeat the
    // question: …"). The card already shows it; keeping both put the same
    // question on screen twice (reported: transcript ended with a repeat of
    // the pinned card).
    const cardTurn = card(Q2, 65, "q2");
    const transcript = [
      card(Q1, 0, "q1"),
      answer("No idea", 42, "a1"),
      cardTurn,
    ];
    const reRead = said(`Let me repeat the question: ${Q2}`, 70, "s-rr");

    const history = stageHistoryTurns(transcript, cardTurn, null, {
      liveTurns: [reRead],
      agentSpeaks: true,
    });

    expect(history.find((t) => t.id === "s-rr")).toBeUndefined();
  });

  it("keeps a restored hint as a history line, not an assistance panel block", () => {
    // Reported: after a reload the persisted hint rendered as a stray
    // "Small hint" panel under the pinned card instead of its chronological
    // place in the transcript.
    const cardTurn = card(Q2, 65, "q2");
    const hint: ConversationTurn = {
      id: "message:h1",
      role: "ai",
      text: "Think about common identifiers you use when you interact with a company online.",
      kind: "hint",
      elapsedSeconds: 125,
      restored: true,
    };
    const transcript = [
      card(Q1, 0, "q1"),
      answer("No idea", 42, "a1"),
      cardTurn,
      answer("Can you give me a hint?", 110, "a2"),
      hint,
    ];

    const history = stageHistoryTurns(transcript, cardTurn, null, {
      liveTurns: [],
      agentSpeaks: true,
    });

    expect(history.map((t) => t.id)).toContain("message:h1");
  });
});
