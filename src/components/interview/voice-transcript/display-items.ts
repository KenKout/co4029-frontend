/**
 * Display-item shapes and the pure builders behind the LiveKit voice
 * transcript.
 *
 * Moved verbatim out of `voice-transcript.tsx` so the component keeps its hook
 * order and its JSX while the merge/derive/emit arithmetic lives on its own.
 */
import type { ConversationTurn } from "@/lib/interview/types";

export interface DisplayItem {
  key: string;
  role: "agent" | "student";
  text: string;
  isFinal: boolean;
  elapsedSeconds?: number;
  historyTurn?: ConversationTurn | null;
}

/** One live transcription segment, before history turns are prepended. */
export interface MergedSegment {
  key: string;
  role: "agent" | "student";
  text: string;
  sortTime: number;
  isFinal: boolean;
}

interface AgentSegment {
  id: string;
  text: string;
  firstReceivedTime: number;
  final: boolean;
}

interface StudentStream {
  participantInfo: { identity?: string };
  streamInfo: { id: string; timestamp: number };
  text: string;
}

/**
 * Interleave the agent's transcription segments with the student's streams.
 *
 * The agent's speech arrives TWICE on `lk.transcription`: the track observer
 * hands it to `useVoiceAssistant()` as per-segment transcriptions, and the
 * data topic hands the SAME utterance to `useTranscriptions()` as its own
 * stream. The identity filter below is the only thing keeping the second copy
 * out of the student list — and it silently fails whenever `agentIdentity` is
 * still unknown (the join window, any reconnect) or does not match the
 * stream's participant, leaking the agent's stream through as a "student"
 * bubble: the same text twice with an identical timestamp (the reported
 * voice-transcript duplicate). A stream that only echoes text the track
 * observer already carries is the SAME utterance, not a second source, so drop
 * it regardless of identity.
 */
export function mergeTranscriptionSegments(
  agentTranscriptions: readonly AgentSegment[],
  allStreams: readonly StudentStream[],
  agentIdentity: string | undefined,
): MergedSegment[] {
  const agentTexts = new Set(
    agentTranscriptions.map((segment) => segment.text.trim()),
  );
  return [
    ...agentTranscriptions.map((segment) => ({
      key: `agent-${segment.id}`,
      role: "agent" as const,
      text: segment.text,
      sortTime: segment.firstReceivedTime,
      isFinal: segment.final,
    })),
    ...allStreams
      .filter(
        (stream) =>
          stream.participantInfo.identity !== agentIdentity &&
          !agentTexts.has(stream.text.trim()),
      )
      .map((stream) => ({
        key: `student-${stream.streamInfo.id}`,
        role: "student" as const,
        text: stream.text,
        sortTime: stream.streamInfo.timestamp,
        isFinal: true,
      })),
  ].sort((first, second) => first.sortTime - second.sortTime);
}

/**
 * The agent's live utterances, as conversation turns on the interview clock.
 *
 * Nothing commits agent text to `transcript`: the answer path appends the
 * candidate's turn and reads no agent text, and the snapshot path renders its own
 * localized transition line rather than wire text. So an agent follow-up or probe
 * had no renderer at all and was dropped.
 *
 * Transcription is therefore the ONLY record of what the interviewer actually
 * said, and it is authoritative over the bank text: this agent paraphrases every
 * question after the first and prefixes its own transitions ("Thanks, Duy. Now,
 * imagine…"). Text-matching a segment against a committed turn cannot identify
 * that pairing — `transcriptMatchesTurn` needs one string to prefix the other —
 * so no filtering is attempted here. The caller drops the committed AI turns
 * instead, which is the side that CAN be identified.
 *
 * `elapsedSeconds` is rebased onto the assessment clock so these interleave with
 * committed turns by time. Without it they pile up at the end and a follow-up
 * from question one renders below question two.
 *
 * `kind` is left UNSET on purpose. A transcription segment carries no turn
 * identity, so labelling every one of them `followup` put a violet FOLLOW-UP
 * badge on the agent reading a brand-new bank question. Only the stage — which
 * knows which question the card is on and when it was answered — can tell a probe
 * from a question reading, so it assigns the label: see `stageHistoryTurns`.
 */
export function liveAgentConversationTurns(
  merged: readonly MergedSegment[],
  assessmentStartedAtMs: number | null,
): ConversationTurn[] {
  return merged
    .filter(
      (segment) => segment.role === "agent" && segment.text.trim().length > 0,
    )
    .map((segment) => ({
      id: segment.key,
      role: "ai" as const,
      text: segment.text,
      live: true,
      elapsedSeconds:
        assessmentStartedAtMs === null
          ? undefined
          : Math.max(0, Math.round((segment.sortTime - assessmentStartedAtMs) / 1000)),
    }));
}

/**
 * Restored history turns first, then the live segments with their timestamps
 * rebased onto the latest history elapsed time.
 */
export function buildDisplayItems(
  initialTurns: readonly ConversationTurn[],
  merged: readonly MergedSegment[],
  transcriptStartedAt: number,
): DisplayItem[] {
  const initialElapsed = initialTurns.reduce(
    (latest, turn) => Math.max(latest, turn.elapsedSeconds ?? 0),
    0,
  );
  return [
    ...initialTurns.map((turn) => ({
      key: `history-${turn.id}`,
      role: turn.role === "ai" ? ("agent" as const) : ("student" as const),
      text: turn.text,
      isFinal: true,
      elapsedSeconds: turn.elapsedSeconds,
      historyTurn: turn,
    })),
    ...merged.map((item) => ({
      ...item,
      elapsedSeconds:
        initialElapsed +
        Math.max(0, Math.floor((item.sortTime - transcriptStartedAt) / 1000)),
      historyTurn: null,
    })),
  ];
}

/** Change key for the `onTranscriptChange` emit guard. */
export function fingerprintDisplayItems(
  displayItems: readonly DisplayItem[],
): string {
  return displayItems
    .map((item) => `${item.key}:${item.text}:${item.isFinal}`)
    .join("|");
}

/** Project display items back onto the route's conversation-turn shape. */
export function toConversationTurns(
  displayItems: readonly DisplayItem[],
): ConversationTurn[] {
  return displayItems.map(
    (item) =>
      item.historyTurn ?? {
        id: item.key,
        role: item.role === "agent" ? "ai" : "user",
        text: item.text,
        elapsedSeconds: item.elapsedSeconds,
        kind: item.role === "agent" ? "question" : "answer",
      },
  );
}

/** The most recent item for a role, or null. */
export function latestItemForRole(
  displayItems: readonly DisplayItem[],
  role: DisplayItem["role"],
): DisplayItem | null {
  return [...displayItems].reverse().find((item) => item.role === role) ?? null;
}
