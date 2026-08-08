import { ConversationMessage } from "@/components/interview/conversation";
import type { ConversationTurn } from "@/lib/interview/types";
import type { StageSpeak } from "./types";

/**
 * The running conversation either side of the active question card.
 *
 * Two lists, one component, because they differ only in position and in whether
 * their text is still arriving:
 *
 * - `history` is committed turns (`transcript` minus whatever the card and the
 *   assistance panel already own). Rendered with `isLatest={false}`, which paints
 *   text immediately and — load-bearing — passes `animate: false` into the
 *   presentation runner so nothing here re-narrates. Without it, scrolling back
 *   would make the interviewer talk again.
 * - `live` is the agent utterances that exist only as transcription: follow-ups
 *   and probes the server never committed as turns. They sit BELOW the answer
 *   because they are newer than it.
 */
export function FocusedStageConversation({
  turns,
  speak,
  onSpeakingChange,
}: {
  turns: readonly ConversationTurn[];
  speak: StageSpeak;
  onSpeakingChange: (speaking: boolean) => void;
}) {
  if (turns.length === 0) return null;
  return (
    <div className="flex flex-col gap-5">
      {turns.map((turn) => (
        <ConversationMessage
          key={turn.id}
          turn={turn}
          isLatest={false}
          streaming={turn.live === true}
          speak={speak}
          onTick={() => undefined}
          onSpeakingChange={onSpeakingChange}
        />
      ))}
    </div>
  );
}
