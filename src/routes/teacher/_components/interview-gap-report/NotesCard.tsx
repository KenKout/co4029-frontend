import { Loader2, Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useSaveGapReportNotes } from "@/lib/api/hooks/interviews";
import type { StudyPlanItem } from "@/lib/api/types";
import { StudyPlanSection } from "./StudyPlanSection";

export function NotesCard({
  sessionId,
  teacherSummary,
  studyPlan,
  courseId,
}: {
  sessionId: string;
  teacherSummary: string | null | undefined;
  studyPlan: StudyPlanItem[];
  courseId: string | null | undefined;
}) {
  const { t } = useTranslation();
  const saveNotes = useSaveGapReportNotes(sessionId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(teacherSummary ?? "");

  function startEditing() {
    setDraft(teacherSummary ?? "");
    setEditing(true);
  }

  async function handleSave() {
    try {
      await saveNotes.mutateAsync(draft.trim() || null);
      toast.success(t("teacher_interview_gap_report.labels.saved"));
      setEditing(false);
    } catch (err) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_gap_report.labels.save_failed"),
      );
    }
  }

  return (
    <GlassCard className="p-6">
      <div className="rounded-xl bg-m3-surface-container-low p-4 border border-m3-outline-variant/20 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase font-bold tracking-widest text-m3-on-surface-variant">
            {t("teacher_interview_gap_report.labels.notes")}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 gap-1 text-xs transition-all duration-200 hover:bg-m3-primary/10 hover:scale-105 active:scale-95 ${
              editing ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            onClick={startEditing}
          >
            <Pencil className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-12" />
            {t("teacher_interview_gap_report.labels.edit")}
          </Button>
        </div>

        {/* Animated expand/collapse for the editor. */}
        <div
          className={`grid transition-all duration-300 ease-out ${
            editing
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-2.5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder={t(
                  "teacher_interview_gap_report.labels.notes_placeholder",
                )}
                className="w-full resize-y rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 py-2.5 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-m3-primary/30"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  disabled={saveNotes.isPending}
                  onClick={() => setEditing(false)}
                >
                  <X className="h-3.5 w-3.5" />
                  {t("teacher_interview_gap_report.labels.cancel")}
                </Button>
                <Button
                  size="sm"
                  className="gap-1 text-xs"
                  disabled={saveNotes.isPending}
                  onClick={() => void handleSave()}
                >
                  {saveNotes.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {saveNotes.isPending
                    ? t("teacher_interview_gap_report.labels.saving")
                    : t("teacher_interview_gap_report.labels.save")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Saved note (or empty hint) — shown only when not editing. */}
        {!editing &&
          (teacherSummary ? (
            <p className="text-sm text-m3-on-surface leading-relaxed whitespace-pre-wrap">
              {teacherSummary}
            </p>
          ) : (
            <p className="text-sm italic text-m3-on-surface-variant">
              {t("teacher_interview_gap_report.labels.notes_empty")}
            </p>
          ))}
      </div>

      <StudyPlanSection studyPlan={studyPlan} courseId={courseId} />
    </GlassCard>
  );
}
