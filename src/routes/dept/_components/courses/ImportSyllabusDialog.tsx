import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useImportCourseFromSyllabus,
  type SyllabusImportResult,
  type SyllabusLanguage,
} from "@/lib/api/hooks/teacher-courses";

/**
 * Manager flow: upload a course syllabus PDF, get a draft course.
 *
 * Two phases in one dialog rather than a dialog plus a toast:
 *
 * 1. **form** — pick the file and the syllabus language. The language is
 *    NOT auto-detected: these syllabi carry both languages for every field,
 *    so which one the course is authored in is a decision, not something to
 *    guess.
 * 2. **result** — what was created, plus any parser warnings. Warnings are
 *    why this stays on screen: an import can succeed while quietly
 *    renumbering learning outcomes (the source syllabus skipped an L.O.
 *    code) and a toast that vanishes in four seconds is the wrong place to
 *    say so. The manager dismisses it or jumps straight to the new draft.
 *
 * Failures render inline with the backend's own reason — the parser
 * explains what was missing ("missing_course_title: …"), which is
 * actionable in a way a generic "import failed" is not.
 */
export function ImportSyllabusDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const importCourse = useImportCourseFromSyllabus();

  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<SyllabusLanguage>("vi");
  const [result, setResult] = useState<SyllabusImportResult | null>(null);
  const prefix = "dept_courses.import_syllabus";

  function reset() {
    setFile(null);
    setResult(null);
    importCourse.reset();
  }

  function handleOpenChange(next: boolean) {
    // Clear on close so reopening never shows the previous import's result
    // or a stale error next to a fresh file.
    if (!next) reset();
    onOpenChange(next);
  }

  function handleImport() {
    if (!file) return;
    importCourse.mutate(
      { file, language },
      { onSuccess: (data) => setResult(data) },
    );
  }

  function openCourse() {
    if (!result) return;
    const courseId = result.course_id;
    handleOpenChange(false);
    void navigate({ to: "/dept/courses/$courseId", params: { courseId } });
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-m3-outline-variant/40 bg-white p-6 shadow-2xl",
            "max-h-[calc(100vh-4rem)] overflow-y-auto outline-none",
            "transition-all duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <DialogPrimitive.Title className="font-headline text-lg font-bold text-text-strong">
            {result ? t(`${prefix}.result_title`) : t(`${prefix}.title`)}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-text-muted">
            {result ? t(`${prefix}.result_subtitle`) : t(`${prefix}.subtitle`)}
          </DialogPrimitive.Description>

          {result ? (
            <ImportResult result={result} />
          ) : (
            <ImportForm
              file={file}
              onFile={setFile}
              language={language}
              onLanguageChange={setLanguage}
              busy={importCourse.isPending}
              error={
                importCourse.isError
                  ? (importCourse.error as Error).message
                  : null
              }
            />
          )}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={importCourse.isPending}
            >
              {result ? t("common.close") : t("common.cancel")}
            </Button>
            {result ? (
              <Button type="button" onClick={openCourse}>
                {t(`${prefix}.open_course`)}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleImport}
                disabled={!file || importCourse.isPending}
              >
                {importCourse.isPending
                  ? t(`${prefix}.importing`)
                  : t(`${prefix}.submit`)}
              </Button>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ImportForm({
  file,
  onFile,
  language,
  onLanguageChange,
  busy,
  error,
}: {
  file: File | null;
  onFile: (file: File) => void;
  language: SyllabusLanguage;
  onLanguageChange: (language: SyllabusLanguage) => void;
  busy: boolean;
  error: string | null;
}) {
  const { t } = useTranslation();
  const prefix = "dept_courses.import_syllabus";

  return (
    <div className="mt-4 space-y-4">
      <FileDropzone
        onFile={onFile}
        accept="application/pdf,.pdf"
        busy={busy}
        busyLabel={t(`${prefix}.importing`)}
        idleTitle={t(`${prefix}.dropzone_title`)}
        hint={t(`${prefix}.dropzone_hint`)}
      />
      {file ? (
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{file.name}</span>
        </p>
      ) : null}

      <Field
        label={t(`${prefix}.language_label`)}
        hint={t(`${prefix}.language_hint`)}
      >
        <Select<SyllabusLanguage>
          value={language}
          onValueChange={onLanguageChange}
          disabled={busy}
          options={[
            { value: "vi", label: t(`${prefix}.language_vi`) },
            { value: "en", label: t(`${prefix}.language_en`) },
          ]}
          aria-label={t(`${prefix}.language_label`)}
        />
      </Field>

      {error ? (
        <div className="flex gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-danger">
              {t(`${prefix}.failed`)}
            </p>
            {/* The backend's own reason, verbatim — it names the missing
                field, which is what the manager needs to fix the file. */}
            <p className="mt-0.5 text-xs break-words text-text-muted">{error}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ImportResult({ result }: { result: SyllabusImportResult }) {
  const { t } = useTranslation();
  const prefix = "dept_courses.import_syllabus";
  const hours =
    result.estimated_minutes === null
      ? null
      : Math.round((result.estimated_minutes / 60) * 10) / 10;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-strong">
            {result.title}
          </p>
          <p className="mt-0.5 font-mono text-xs text-text-muted">
            {result.course_slug}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-text-muted">
            {t(`${prefix}.summary_outcomes`)}
          </dt>
          <dd className="font-semibold text-text-strong">
            {result.outcome_count}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">
            {t(`${prefix}.summary_hours`)}
          </dt>
          <dd className="font-semibold text-text-strong">
            {hours === null ? "—" : t(`${prefix}.hours_value`, { hours })}
          </dd>
        </div>
      </dl>

      {result.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t(`${prefix}.warnings_title`, { count: result.warnings.length })}
          </p>
          <ul className="mt-2 space-y-1">
            {result.warnings.map((warning) => (
              <li key={warning} className="text-xs break-words text-amber-900/80">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
