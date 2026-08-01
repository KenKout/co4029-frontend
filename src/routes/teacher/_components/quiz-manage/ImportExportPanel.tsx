import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  downloadQuizExport,
  useImportQuestionsFromFile,
  type ImportResult,
} from "@/lib/api/hooks/quizzes";
import { QuizExportSection } from "./QuizExportSection";
import { QuizImportSection } from "./QuizImportSection";

/**
 * Phase 11 — question import/export. Import parses a Moodle GIFT or XML file
 * (paste or upload) into pending questions; a malformed file is rejected whole
 * (422) with per-question skips surfaced as warnings. Export downloads the
 * quiz's questions in either format. Self-contained dialog opened from the
 * Questions tab so it doesn't bloat quiz-manage.tsx.
 */
export function ImportExportPanel({
  quizId,
  onClose,
}: {
  quizId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const importMut = useImportQuestionsFromFile(quizId);
  const [format, setFormat] = useState<"gift" | "xml">("gift");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleFile(file: File) {
    const text = await file.text();
    setContent(text);
    // Infer format from extension when obvious.
    if (file.name.endsWith(".xml")) setFormat("xml");
    else if (file.name.endsWith(".txt") || file.name.endsWith(".gift"))
      setFormat("gift");
  }

  async function handleImport() {
    if (!content.trim()) {
      toast.error(t("teacher_quiz_manage.import_export.empty_content"));
      return;
    }
    try {
      const res = await importMut.mutateAsync({ content, format });
      setResult(res);
      toast.success(
        t("teacher_quiz_manage.import_export.imported", {
          count: res.imported,
        }),
      );
    } catch {
      toast.error(t("teacher_quiz_manage.import_export.import_failed"));
    }
  }

  async function handleExport(fmt: "gift" | "xml") {
    setExporting(true);
    try {
      await downloadQuizExport(quizId, fmt);
    } catch {
      toast.error(t("teacher_quiz_manage.import_export.export_failed"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-m3-surface p-6 shadow-editorial space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-m3-on-surface">
              {t("teacher_quiz_manage.import_export.title")}
            </h2>
            <p className="text-sm text-m3-on-surface-variant mt-0.5">
              {t("teacher_quiz_manage.import_export.description")}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <QuizExportSection exporting={exporting} onExport={handleExport} />

        <QuizImportSection
          format={format}
          onFormatChange={setFormat}
          content={content}
          onContentChange={setContent}
          result={result}
          importing={importMut.isPending}
          onFile={handleFile}
          onImport={handleImport}
        />
      </div>
    </div>
  );
}
