import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";
import { Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import type { QuestionDraft } from "./types";

/**
 * Explanation field plus the Configuration block (difficulty + expected
 * response time). Extracted from QuestionCard verbatim.
 *
 * Explanation comes before Configuration: it's the content-authoring field
 * (what students see), so it sits with the question body; the Configuration
 * block (difficulty / expected time) is metadata and follows it.
 */
export function QuestionCardConfig({
  question,
  draft,
  setDraft,
  draftTimeInvalid,
}: {
  question: QuizQuestionAuthoring;
  draft: QuestionDraft;
  setDraft: Dispatch<SetStateAction<QuestionDraft>>;
  draftTimeInvalid: boolean;
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.editor.explanation_label")}
        </label>
        <textarea
          value={draft.explanation}
          onChange={(e) =>
            setDraft((current) => ({ ...current, explanation: e.target.value }))
          }
          rows={2}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
      </div>

      <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-m3-secondary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-m3-secondary">
            {t("teacher_quiz_manage.editor.metadata_label", "Configuration")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_quiz_manage.editor.difficulty_label", "Difficulty")}
            </label>
            <Select<string>
              value={draft.difficulty}
              onValueChange={(next) =>
                setDraft((current) => ({
                  ...current,
                  difficulty: next,
                }))
              }
              options={["easy", "medium", "hard"].map((level) => ({
                value: level,
                label: level,
              }))}
              size="sm"
              className="capitalize"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`qexp-${question.id}`}
              className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant"
            >
              {t("teacher_quiz_manage.editor.t_exp_label", "Expected time (s)")}
              {/* Required marker — the SR scheduler divides by this value. */}
              <span className="ml-0.5 text-red-600" aria-hidden="true">
                *
              </span>
            </label>
            <Input
              id={`qexp-${question.id}`}
              type="number"
              min={1}
              max={600}
              required
              aria-invalid={draftTimeInvalid || undefined}
              aria-describedby={
                draftTimeInvalid ? `qexp-err-${question.id}` : undefined
              }
              value={draft.expected_response_seconds ?? ""}
              placeholder={t(
                "teacher_quiz_manage.editor.t_exp_placeholder",
                "e.g. 45",
              )}
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  expected_response_seconds:
                    e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className={cn(
                "h-8 bg-m3-surface text-xs",
                draftTimeInvalid &&
                  "border-red-500 focus-visible:ring-red-500/30",
              )}
            />
            {draftTimeInvalid && (
              <p
                id={`qexp-err-${question.id}`}
                className="text-[10px] font-semibold text-red-600"
              >
                {t("teacher_quiz_manage.errors.expected_time_required")}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
