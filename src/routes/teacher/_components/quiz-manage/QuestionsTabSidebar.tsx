import { useTranslation } from "react-i18next";
import { BookOpen, FileUp, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { QuestionNavigator } from "./QuestionNavigator";

/**
 * Right-hand column of the questions tab: the authoring panel (AI generation /
 * bank import / file import) above the question navigator. Extracted from
 * QuestionsTab verbatim.
 */
export function QuestionsTabSidebar({
  questions,
  selectedIds,
  dirtyIds,
  published,
  onOpenGenerator,
  onOpenBank,
  onOpenImportExport,
}: {
  questions: QuizQuestionAuthoring[];
  selectedIds: Set<string>;
  dirtyIds: Set<string>;
  published: boolean;
  onOpenGenerator: () => void;
  onOpenBank: () => void;
  onOpenImportExport: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="col-span-12 lg:col-span-4 min-w-0">
      <div className="lg:sticky lg:top-[8.5rem] space-y-4">
        {/* AI generation / bank import / file import all SEED new questions,
            which a published quiz can't accept — hide the whole authoring
            panel when frozen. The read-only QuestionNavigator stays so the
            teacher can still jump between questions. */}
        {!published && (
          <div className="rounded-xl border border-m3-secondary/10 bg-m3-surface-container-low p-5 shadow-glass space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-headline font-bold text-sm text-m3-on-surface">
                  {t("teacher_quiz_manage.ai_panel.title")}
                </h2>
                <p className="text-xs text-m3-on-surface-variant">
                  {t("teacher_quiz_manage.ai_panel.description")}
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={onOpenGenerator}
              className="w-full gap-2 gradient-primary text-white border-0 shadow-ai-glow"
            >
              <Sparkles className="h-4 w-4" />
              {t("teacher_quiz_manage.ai_panel.open_generator")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onOpenBank}
              className="w-full gap-2"
            >
              <BookOpen className="h-4 w-4" />
              {t(
                "teacher_quiz_manage.ai_panel.import_from_bank",
                "Import from bank",
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onOpenImportExport}
              className="w-full gap-2"
            >
              <FileUp className="h-4 w-4" />
              {t("teacher_quiz_manage.ai_panel.import_export_file")}
            </Button>
          </div>
        )}

        {/* Quick question navigation — jumps (auto-scrolls) to a question
            card. Reuses the numbered-box design from the student quiz. */}
        <QuestionNavigator
          questions={questions}
          selectedIds={selectedIds}
          dirtyIds={dirtyIds}
        />
      </div>
    </div>
  );
}
