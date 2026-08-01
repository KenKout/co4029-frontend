import { useTranslation } from "react-i18next";
import { FileUp, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { ImportResult } from "@/lib/api/hooks/quizzes";

/**
 * Import half of the import/export dialog: format picker, file/paste input, the
 * per-question skip warnings, and the import action. Extracted from
 * ImportExportPanel verbatim.
 */
export function QuizImportSection({
  format,
  onFormatChange,
  content,
  onContentChange,
  result,
  importing,
  onFile,
  onImport,
}: {
  format: "gift" | "xml";
  onFormatChange: (next: "gift" | "xml") => void;
  content: string;
  onContentChange: (next: string) => void;
  result: ImportResult | null;
  importing: boolean;
  onFile: (file: File) => Promise<void>;
  onImport: () => Promise<void>;
}) {
  const { t } = useTranslation();

  return (
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
          onValueChange={(next) => onFormatChange(next)}
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
              if (file) void onFile(file);
            }}
          />
        </label>
      </div>
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        rows={8}
        placeholder={t("teacher_quiz_manage.import_export.content_placeholder")}
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
        disabled={importing}
        onClick={() => void onImport()}
      >
        {importing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {t("teacher_quiz_manage.import_export.import_action")}
      </Button>
    </div>
  );
}
