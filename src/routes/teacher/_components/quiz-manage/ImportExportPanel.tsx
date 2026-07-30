import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileUp, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  downloadQuizExport,
  useImportQuestionsFromFile,
  type ImportResult,
} from "@/lib/api/hooks/quizzes";

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

        {/* Export */}
        <div className="rounded-xl border border-m3-outline-variant/30 p-4 space-y-2">
          <p className="text-sm font-bold text-m3-on-surface">
            {t("teacher_quiz_manage.import_export.export_title")}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={exporting}
              onClick={() => void handleExport("gift")}
            >
              <Download className="h-4 w-4" />
              GIFT
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={exporting}
              onClick={() => void handleExport("xml")}
            >
              <Download className="h-4 w-4" />
              Moodle XML
            </Button>
          </div>
        </div>

        {/* Import */}
        <div className="rounded-xl border border-m3-outline-variant/30 p-4 space-y-3">
          <p className="text-sm font-bold text-m3-on-surface">
            {t("teacher_quiz_manage.import_export.import_title")}
          </p>
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_quiz_manage.import_export.format_label")}
            </label>
            <Select<"gift" | "xml">
              value={format}
              onValueChange={(next) => setFormat(next)}
              options={[
                { value: "gift", label: "GIFT" },
                { value: "xml", label: "Moodle XML" },
              ]}
              size="sm"
              className="w-40"
            />
            <label className="inline-flex items-center gap-1.5 text-sm text-m3-primary cursor-pointer">
              <FileUp className="h-4 w-4" />
              {t("teacher_quiz_manage.import_export.upload")}
              <input
                type="file"
                accept=".txt,.gift,.xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </label>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder={t(
              "teacher_quiz_manage.import_export.content_placeholder",
            )}
            className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface px-3 py-2 text-sm font-mono"
          />

          {result && (
            <div className="rounded-lg bg-m3-surface-container-low p-3 text-sm space-y-1">
              <p className="text-m3-on-surface">
                {t("teacher_quiz_manage.import_export.result_summary", {
                  imported: result.imported,
                  skipped: result.skipped,
                })}
              </p>
              {result.warnings.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-amber-700 space-y-0.5">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Button
            className="gap-1.5"
            disabled={importMut.isPending}
            onClick={() => void handleImport()}
          >
            {importMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {t("teacher_quiz_manage.import_export.import_action")}
          </Button>
        </div>
      </div>
    </div>
  );
}
