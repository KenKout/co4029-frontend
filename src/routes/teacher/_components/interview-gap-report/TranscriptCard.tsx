import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useInterviewTranscript } from "@/lib/api/hooks/interviews";
import { TRANSCRIPT_PAGE_SIZE } from "./constants";
import { formatRelativeTime } from "./helpers";

export function TranscriptCard({
  sessionId,
  studentName,
}: {
  sessionId: string;
  studentName: string | null;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useInterviewTranscript(sessionId);
  const turns = data?.turns ?? [];
  const [page, setPage] = useState(0);

  // Baseline for relative timestamps: the first turn is 0:00, every later turn
  // is its offset from that first turn (matches the live interview session).
  const baseline =
    turns.length > 0 ? new Date(turns[0].created_at).getTime() : 0;

  const total = turns.length;
  const pageCount = Math.max(1, Math.ceil(total / TRANSCRIPT_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * TRANSCRIPT_PAGE_SIZE;
  const pageTurns = turns.slice(start, start + TRANSCRIPT_PAGE_SIZE);

  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-headline font-bold text-m3-primary">
          {t("teacher_interview_gap_report.transcript.title")}
        </h3>
        {total > TRANSCRIPT_PAGE_SIZE && (
          <span className="text-xs text-m3-on-surface-variant tabular-nums">
            {t("teacher_interview_gap_report.transcript.page_status", {
              start: start + 1,
              end: Math.min(start + TRANSCRIPT_PAGE_SIZE, total),
              total,
            })}
          </span>
        )}
      </div>
      {isLoading && (
        <p className="text-sm text-m3-on-surface-variant">
          {t("common.loading")}
        </p>
      )}
      {!isLoading && turns.length === 0 && (
        <p className="text-sm text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.transcript.empty")}
        </p>
      )}
      {turns.length > 0 && (
        <>
          <ul className="space-y-3">
            {pageTurns.map((turn, idx) => {
              // Only show the question prompt when a NEW question starts —
              // i.e. when this turn's prompt differs from the previous turn's.
              // The same prompt is attached to every turn of a question
              // (the answer, clarify requests, AI rephrases), so rendering it
              // each time repeats the full question and makes the log messy.
              const absoluteIdx = start + idx;
              const prevPrompt =
                absoluteIdx > 0
                  ? (turns[absoluteIdx - 1].question_prompt ?? null)
                  : null;
              const showPrompt =
                Boolean(turn.question_prompt) &&
                turn.question_prompt !== prevPrompt;
              return (
                <li
                  key={absoluteIdx}
                  className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 space-y-1"
                >
                  {/* Header line: speaker on the left, timestamp on the far
                      right. The speaker label is on its own line so the timer
                      can never collide with a long question prompt or answer. */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-m3-primary">
                      {turn.role === "user" && studentName
                        ? studentName
                        : t(
                            `teacher_interview_gap_report.transcript.role.${turn.role}`,
                          )}
                    </span>
                    {/* Relative timestamp (0:00 = first turn), pushed to the far right. */}
                    <time className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-m3-primary">
                      {formatRelativeTime(
                        (new Date(turn.created_at).getTime() - baseline) / 1000,
                      )}
                    </time>
                  </div>
                  {showPrompt && (
                    <p className="text-[11px] font-semibold text-m3-outline uppercase tracking-widest">
                      {turn.question_prompt}
                    </p>
                  )}
                  {/* Content always begins below the header line. */}
                  <p className="text-sm text-m3-on-surface leading-relaxed">
                    {turn.content_text ??
                      (turn.has_audio
                        ? t(
                            "teacher_interview_gap_report.transcript.audio_only",
                          )
                        : "—")}
                  </p>
                </li>
              );
            })}
          </ul>
          {pageCount > 1 && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("teacher_interview_gap_report.transcript.prev")}
              </Button>
              <span className="text-xs text-m3-on-surface-variant tabular-nums px-1">
                {safePage + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                {t("teacher_interview_gap_report.transcript.next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}
