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

/** Interleave the agent's transcription segments with the student's streams. */
export function mergeTranscriptionSegments(
  agentTranscriptions: readonly AgentSegment[],
  allStreams: readonly StudentStream[],
  agentIdentity: string | undefined,
): MergedSegment[] {
  return [
    ...agentTranscriptions.map((segment) => ({
      key: `agent-${segment.id}`,
      role: "agent" as const,
      text: segment.text,
      sortTime: segment.firstReceivedTime,
      isFinal: segment.final,
    })),
    ...allStreams
      .filter((stream) => stream.participantInfo.identity !== agentIdentity)
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
