import { describe, expect, it } from "vitest";

import {
  liveAgentConversationTurns,
  mergeTranscriptionSegments,
} from "./display-items";

/**
 * The voice transcript's single-source rule: the agent's own speech reaches
 * `mergeTranscriptionSegments` twice — once as track-observer segments
 * (`useVoiceAssistant().agentTranscriptions`) and once as the agent's stream on
 * the `lk.transcription` data topic (`useTranscriptions()`). The merge must
 * render the agent's utterance exactly once (as an agent item), keeping the
 * transcription stream as the source and never leaking the data-topic echo
 * through as a student item.
 */
describe("mergeTranscriptionSegments — agent speech single source", () => {
  const agentSegment = {
    id: "SG_abc",
    text: "Thank you. Now let's move on to the next question.",
    firstReceivedTime: 91_000,
    final: true,
  };
  const agentStream = {
    participantInfo: { identity: "interview-agent-xyz" },
    streamInfo: { id: "stream-1", timestamp: 91_000 },
    text: "Thank you. Now let's move on to the next question.",
  };
  const studentStream = {
    participantInfo: { identity: "student-42" },
    streamInfo: { id: "stream-2", timestamp: 88_000 },
    text: "My answer.",
  };

  it("keeps one agent item when the identity filter can exclude the agent's stream", () => {
    const merged = mergeTranscriptionSegments(
      [agentSegment],
      [agentStream, studentStream],
      "interview-agent-xyz",
    );
    const agentItems = merged.filter((item) => item.role === "agent");
    expect(agentItems).toHaveLength(1);
    expect(agentItems[0].text).toBe(agentSegment.text);
  });

  it("still renders the agent text once when agentIdentity is unknown (join window / reconnect)", () => {
    // Regression for the reported duplicate: with `agentIdentity` undefined the
    // identity filter keeps the agent's data-topic stream, which used to render
    // the same text twice with an identical timestamp.
    const merged = mergeTranscriptionSegments(
      [agentSegment],
      [agentStream, studentStream],
      undefined,
    );
    const sameText = merged.filter(
      (item) => item.text === agentSegment.text,
    );
    expect(sameText).toHaveLength(1);
    expect(sameText[0].role).toBe("agent");
  });

  it("does not suppress a genuine student answer", () => {
    const merged = mergeTranscriptionSegments(
      [agentSegment],
      [agentStream, studentStream],
      undefined,
    );
    const studentItems = merged.filter((item) => item.role === "student");
    expect(studentItems).toHaveLength(1);
    expect(studentItems[0].text).toBe("My answer.");
  });

  it("renders a repeated agent sentence once per utterance", () => {
    const secondSegment = {
      ...agentSegment,
      id: "SG_def",
      firstReceivedTime: 300_000,
    };
    const secondStream = {
      ...agentStream,
      streamInfo: { id: "stream-3", timestamp: 300_000 },
    };
    const merged = mergeTranscriptionSegments(
      [agentSegment, secondSegment],
      [agentStream, secondStream],
      undefined,
    );
    const agentItems = merged.filter((item) => item.role === "agent");
    expect(agentItems).toHaveLength(2);
    const studentItems = merged.filter((item) => item.role === "student");
    expect(studentItems).toHaveLength(0);
  });
});

describe("liveAgentConversationTurns — the agent's reply becomes visible", () => {
  const agentSegment = (id: string, text: string) => ({
    id,
    text,
    firstReceivedTime: 1,
    final: true,
  });

  it("surfaces a follow-up the server never committed as a turn", () => {
    // The reported bug: the candidate submitted, the agent probed further, and
    // the screen showed the answer followed by nothing. No tool call fires for a
    // probe, so no snapshot and no transcript turn ever carries it — transcription
    // is the only source it will ever have.
    const merged = mergeTranscriptionSegments(
      [agentSegment("s1", "Can you say more about the index?")],
      [],
      "agent-1",
    );
    const turns = liveAgentConversationTurns(merged, null);

    expect(turns).toHaveLength(1);
    expect(turns[0].text).toBe("Can you say more about the index?");
    expect(turns[0].role).toBe("ai");
  });

  it("asserts no turn kind, because a transcription segment carries none", () => {
    // Hardcoding `followup` here badged the agent reading a brand-new bank
    // question as a FOLLOW-UP. Only the stage knows which question the card is on.
    const merged = mergeTranscriptionSegments(
      [agentSegment("s1", "Imagine a company that stores customer data…")],
      [],
      "agent-1",
    );

    expect(liveAgentConversationTurns(merged, null)[0].kind).toBeUndefined();
  });

  it("survives the next turn rather than being replaced by it", () => {
    const merged = mergeTranscriptionSegments(
      [
        agentSegment("s1", "Can you say more about the index?"),
        agentSegment("s2", "And when would it not help?"),
      ],
      [],
      "agent-1",
    );
    const turns = liveAgentConversationTurns(merged, null);

    expect(turns.map((turn) => turn.text)).toEqual([
      "Can you say more about the index?",
      "And when would it not help?",
    ]);
  });

  it("puts live utterances on the interview clock so they interleave by time", () => {
    // Without this they sort to the end, and a follow-up from question one renders
    // below question two — the reported out-of-order transcript.
    const startedAt = 1_000_000;
    const merged = mergeTranscriptionSegments(
      [{ id: "s1", text: "A probe", firstReceivedTime: startedAt + 8_000, final: true }],
      [],
      "agent-1",
    );

    expect(liveAgentConversationTurns(merged, startedAt)[0].elapsedSeconds).toBe(8);
  });

  it("drops the candidate's own dictated speech, already committed as an answer", () => {
    const merged = mergeTranscriptionSegments(
      [],
      [
        {
          participantInfo: { identity: "student-1" },
          streamInfo: { id: "st1", timestamp: 2 },
          text: "An index speeds up lookups",
        },
      ],
      "agent-1",
    );

    expect(liveAgentConversationTurns(merged, null)).toEqual([]);
  });
});
