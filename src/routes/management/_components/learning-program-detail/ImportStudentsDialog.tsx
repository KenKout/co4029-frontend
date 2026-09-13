import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { cn } from "@/lib/utils";
import {
  useImportProgramStudentsCsv,
  type ProgramCsvImportResult,
} from "@/lib/api/hooks/learning-programs";

/**
 * Roster CSV import for a learning program.
 *
 * Two phases, like the syllabus importer: pick a file, then read a per-row
 * result. The result phase is the point — the endpoint deliberately does not
 * abort on a bad line, so "27 enrolled, 2 already in, 1 failed on row 14"
 * has to be readable rather than collapsed into a toast.
 */
export function ImportStudentsDialog({
  programId,
  onClose,
}: {
  programId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const importCsv = useImportProgramStudentsCsv(programId);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ProgramCsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      importCsv.mutate(
        { csv_text: String(reader.result ?? "") },
        {
          onSuccess: setResult,
          onError: (e) => setError((e as Error).message),
        },
      );
    };
    reader.readAsText(file);
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
            "max-h-[calc(100vh-4rem)] overflow-y-auto rounded-xl border border-m3-outline-variant/40",
            "bg-white p-6 shadow-2xl outline-none",
          )}
        >
          <DialogPrimitive.Title className="font-headline text-lg font-bold text-text-strong">
            {result
              ? t("management_learning_program_detail.import.finished")
              : t("management_learning_program_detail.import.title")}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-text-muted">
            {result
              ? t("management_learning_program_detail.import.finished_description")
              : t("management_learning_program_detail.import.description")}
          </DialogPrimitive.Description>

          {result ? (
            <ImportResult result={result} />
          ) : (
            <div className="mt-4 space-y-3">
              <FileDropzone
                onFile={handleFile}
                accept=".csv,text/csv"
                busy={importCsv.isPending}
                busyLabel={t("management_learning_program_detail.import.importing")}
                idleTitle={t("management_learning_program_detail.import.dropzone")}
                hint={t("management_learning_program_detail.import.csv_only")}
              />
              {fileName ? (
                <p className="flex items-center gap-2 text-sm text-text-muted">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{fileName}</span>
                </p>
              ) : null}
              {error ? (
                <p className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs break-words text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={importCsv.isPending}>
              {result
                ? t("management_learning_program_detail.actions.close")
                : t("management_learning_program_detail.actions.cancel")}
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ImportResult({ result }: { result: ProgramCsvImportResult }) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t("management_learning_program_detail.import.enrolled")} value={result.enrolled.length} tone="good" />
        <Stat label={t("management_learning_program_detail.import.new_accounts")} value={result.created_users.length} />
        <Stat label={t("management_learning_program_detail.import.already_in")} value={result.already_enrolled.length} />
      </div>

      {result.failures.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("management_learning_program_detail.import.failed_rows", {
              count: result.failures.length,
            })}
          </p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {result.failures.map((f) => (
              <li
                key={`${f.row_number}:${f.identifier ?? ""}`}
                className="text-xs break-words text-amber-900/80"
              >
                {t("management_learning_program_detail.import.row", {
                  number: f.row_number,
                })}
                {f.identifier ? ` (${f.identifier})` : ""} — {f.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("management_learning_program_detail.import.all_imported")}
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good";
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-xl font-bold tabular-nums",
          tone === "good" ? "text-emerald-600" : "text-text-strong",
        )}
      >
        {value}
      </p>
    </div>
  );
}
