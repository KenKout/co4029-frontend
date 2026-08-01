/** Focused live transcript for the LiveKit voice interview. */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useTranscriptions,
  useVoiceAssistant,
} from "@livekit/components-react";

import {
  buildDisplayItems,
  fingerprintDisplayItems,
  latestItemForRole,
  mergeTranscriptionSegments,
  toConversationTurns,
  type DisplayItem,
} from "@/components/interview/voice-transcript/display-items";
import {
  CurrentQuestionCard,
  IdleQuestionPlaceholder,
  LatestAnswerCard,
  TranscriptDrawer,
} from "@/components/interview/voice-transcript/transcript-views";
import { cn } from "@/lib/utils";
import type { ConversationTurn } from "@/lib/interview/types";

interface VoiceTranscriptProps {
  className?: string;
  initialTurns?: ConversationTurn[];
  onTranscriptChange?: (turns: ConversationTurn[]) => void;
}

export function VoiceTranscript({
  className,
  initialTurns = [],
  onTranscriptChange,
}: VoiceTranscriptProps) {
  const { agentTranscriptions, agent } = useVoiceAssistant();
  const allStreams = useTranscriptions();
  const emittedFingerprintRef = useRef("");
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const agentIdentity = agent?.identity;
  const merged = useMemo(
    () =>
      mergeTranscriptionSegments(
        agentTranscriptions,
        allStreams,
        agentIdentity,
      ),
    [agentIdentity, agentTranscriptions, allStreams],
  );

  const transcriptStartedAt = merged[0]?.sortTime ?? 0;
  const displayItems: DisplayItem[] = useMemo(
    () => buildDisplayItems(initialTurns, merged, transcriptStartedAt),
    [initialTurns, merged, transcriptStartedAt],
  );

  useEffect(() => {
    if (!onTranscriptChange) return;
    const fingerprint = fingerprintDisplayItems(displayItems);
    if (fingerprint === emittedFingerprintRef.current) return;
    emittedFingerprintRef.current = fingerprint;
    onTranscriptChange(toConversationTurns(displayItems));
  }, [displayItems, onTranscriptChange]);

  const currentAi = useMemo(
    () => latestItemForRole(displayItems, "agent"),
    [displayItems],
  );
  const currentCandidate = useMemo(
    () => latestItemForRole(displayItems, "student"),
    [displayItems],
  );

  return (
    <div className={cn("flex min-h-0 flex-col gap-4", className)}>
      {currentAi ? (
        <CurrentQuestionCard item={currentAi} />
      ) : (
        <IdleQuestionPlaceholder />
      )}

      {currentCandidate && <LatestAnswerCard item={currentCandidate} />}

      <TranscriptDrawer
        open={transcriptOpen}
        onOpenChange={setTranscriptOpen}
        displayItems={displayItems}
      />
    </div>
  );
}
