import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useImportCourseFromSyllabus,
  type SyllabusImportMode,
  type SyllabusImportResult,
  type SyllabusLanguage,
} from "@/lib/api/hooks/teacher-courses";
import { useMe } from "@/lib/api/hooks/auth";
import {
  useFacultyAssignments,
  useOrgUnits,
} from "@/lib/api/hooks/admin-organizations";

/**
 * Manager flow: upload a course syllabus PDF.
 *
 * Two phases in one dialog rather than a dialog plus a toast:
 *
 * 1. **form** — pick the file, what the upload should DO, and the syllabus
 *    language. The language is NOT auto-detected: these syllabi carry both
 *    languages for every field, so which one the course is authored in is a
 *    decision, not something to guess.
 * 2. **result** — what was created, plus any parser warnings. Warnings are
 *    why this stays on screen: an import can succeed while quietly
 *    renumbering learning outcomes (the source syllabus skipped an L.O.
 *    code) and a toast that vanishes in four seconds is the wrong place to
 *    say so. The manager dismisses it or jumps straight to the new draft.
 *
 * `courseId` switches the dialog between its two call sites:
 *
 * - absent (/dept course list) — the only thing an upload can mean there is
 *   "create a course", so no mode selector is shown.
 * - present (/dept/courses/$courseId) — the manager chooses between
 *   **Upload only** (replace the downloadable document, leave the course
 *   alone), **Override existing** (rewrite title/description/hours + the whole
 *   learning-outcome tree, draft only) and **Create new course**. Override is
 *   hidden for a non-draft course rather than shown-and-rejected: the backend
 *   answers 409 there because published outcomes are the graded scale.
 *
 * Failures render inline with the backend's own reason — the parser
 * explains what was missing ("missing_course_title: …"), which is
 * actionable in a way a generic "import failed" is not.
 */
export function ImportSyllabusDialog({
  open,
  onOpenChange,
  courseId,
  courseStatus,
  hasSyllabus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Target course. Omit on the course LIST, where only `create` makes sense. */
  courseId?: string;
  /** Target course status; `override` is draft-only, so it gates the option. */
  courseStatus?: string;
  /** Whether the course already has a syllabus document (any successful
   *  import). When true, attach/override replace it — the dialog says so and
   *  asks for confirmation before submitting. */
  hasSyllabus?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const importCourse = useImportCourseFromSyllabus();
  const { data: me } = useMe();
  const faculties = useOrgUnits(me?.organization_id ?? undefined, { onlyRoots: true });
  const facultyAssignments = useFacultyAssignments(me?.organization_id ?? undefined);

  const onCourse = Boolean(courseId);
  const canOverride = onCourse && courseStatus === "draft";
  // Default to the least destructive thing that makes sense here: on a draft,
  // "upload only" leaves authored fields untouched; on the list there is no
  // course to upload onto, so it can only be a create.
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<SyllabusImportMode>(
    onCourse ? "attach" : "create",
  );
  const [language, setLanguage] = useState<SyllabusLanguage>("vi");
  const [facultyId, setFacultyId] = useState("");
  const [result, setResult] = useState<SyllabusImportResult | null>(null);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const prefix = "dept_courses.import_syllabus";
  const assignedFacultyIds = useMemo(
    () =>
      new Set(
        (facultyAssignments.data ?? [])
          .filter((row) => row.user_id === me?.id)
          .map((row) => row.faculty_id),
      ),
    [facultyAssignments.data, me?.id],
  );
  const facultyOptions = useMemo(() => {
    const all = faculties.data ?? [];
    const visible = assignedFacultyIds.size > 0
      ? all.filter((faculty) => assignedFacultyIds.has(faculty.id))
      : all;
    return visible.map((faculty) => ({ value: faculty.id, label: faculty.name }));
  }, [assignedFacultyIds, faculties.data]);
  useEffect(() => {
    if (!facultyId && assignedFacultyIds.size === 1 && facultyOptions[0]) {
      setFacultyId(facultyOptions[0].value);
    }
  }, [assignedFacultyIds, facultyId, facultyOptions]);

  function reset() {
    setFile(null);
    setResult(null);
    setConfirmReplaceOpen(false);
    setMode(onCourse ? "attach" : "create");
    importCourse.reset();
  }

  function handleOpenChange(next: boolean) {
    // Clear on close so reopening never shows the previous import's result
    // or a stale error next to a fresh file.
    if (!next) reset();
    onOpenChange(next);
  }

  function runImport() {
    if (!file) return;
    importCourse.mutate(
      {
        file,
        language,
        mode,
        courseId,
        facultyId: mode === "create" ? facultyId || undefined : undefined,
      },
      { onSuccess: (data) => setResult(data) },
    );
  }

  function handleImport() {
    // Creating a NEW course never touches an existing syllabus; attaching or
    // overriding REPLACES the uploaded document, so a course that already has
    // one requires an explicit confirmation first.
    if (hasSyllabus && mode !== "create") {
      setConfirmReplaceOpen(true);
      return;
    }
    runImport();
  }

  function openCourse() {
    if (!result) return;
    const created = result.course_id;
    handleOpenChange(false);
    void navigate({
      to: "/management/courses/$courseId",
      params: { courseId: created },
    });
  }

  // On the course page an attach/override lands on the course you are already
  // looking at, so "Open course" would be a no-op — Close is the only action.
  const resultIsElsewhere = !onCourse || result?.course_id !== courseId;

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
            <ImportResult result={result} mode={mode} />
          ) : (
            <ImportForm
              file={file}
              onFile={setFile}
              language={language}
              onLanguageChange={setLanguage}
              facultyId={facultyId}
              onFacultyChange={setFacultyId}
              facultyOptions={facultyOptions}
              facultyRequired={mode === "create" && assignedFacultyIds.size > 1}
              mode={mode}
              onModeChange={setMode}
              showModes={onCourse}
              canOverride={canOverride}
              courseStatus={courseStatus}
              hasSyllabus={hasSyllabus}
              busy={importCourse.isPending}
              error={importCourse.isError ? importCourse.error.message : null}
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
              resultIsElsewhere ? (
                <Button type="button" onClick={openCourse}>
                  {t(`${prefix}.open_course`)}
                </Button>
              ) : null
            ) : (
              <Button
                type="button"
                onClick={handleImport}
                disabled={
                  !file ||
                  importCourse.isPending ||
                  (mode === "create" && assignedFacultyIds.size > 1 && !facultyId)
                }
              >
                {importCourse.isPending
                  ? t(`${prefix}.importing`)
                  : t(`${prefix}.submit`)}
              </Button>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>

      {/* Replacing an existing syllabus is destructive-ish: the old document
          is gone once the new import lands, so ask before firing. */}
      <ConfirmDialog
        open={confirmReplaceOpen}
        onOpenChange={(next) => {
          if (!next) setConfirmReplaceOpen(false);
        }}
        title={t(`${prefix}.replace_confirm_title`)}
        description={t(`${prefix}.replace_confirm_body`)}
        confirmLabel={t(`${prefix}.replace_confirm_submit`)}
        cancelLabel={t("common.cancel")}
        confirmVariant="destructive"
        isPending={importCourse.isPending}
        onConfirm={() => {
          setConfirmReplaceOpen(false);
          runImport();
        }}
      />
    </DialogPrimitive.Root>
  );
}

/** Amber banner: the upload will replace the course's current syllabus. */
function ReplaceSyllabusWarning({ text }: { text: string }) {
  return (
    <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
      <p className="text-xs text-amber-900">{text}</p>
    </div>
  );
}

function ImportForm({
  file,
  onFile,
  language,
  onLanguageChange,
  facultyId,
  onFacultyChange,
  facultyOptions,
  facultyRequired,
  mode,
  onModeChange,
  showModes,
  canOverride,
  courseStatus,
  hasSyllabus,
  busy,
  error,
}: {
  file: File | null;
  onFile: (file: File) => void;
  language: SyllabusLanguage;
  onLanguageChange: (language: SyllabusLanguage) => void;
  facultyId: string;
  onFacultyChange: (facultyId: string) => void;
  facultyOptions: { value: string; label: string }[];
  facultyRequired: boolean;
  mode: SyllabusImportMode;
  onModeChange: (mode: SyllabusImportMode) => void;
  showModes: boolean;
  canOverride: boolean;
  courseStatus?: string;
  hasSyllabus?: boolean;
  busy: boolean;
  error: string | null;
}) {
  const { t } = useTranslation();
  const prefix = "dept_courses.import_syllabus";

  const modeOptions: { value: SyllabusImportMode; label: string }[] = [
    { value: "attach", label: t(`${prefix}.mode_attach`) },
    // Override is omitted (not disabled) for a published/archived course: the
    // backend refuses it with 409 because the learning outcomes are frozen
    // once students can be graded against them.
    ...(canOverride
      ? [{ value: "override", label: t(`${prefix}.mode_override`) } as const]
      : []),
    { value: "create", label: t(`${prefix}.mode_create`) },
  ];

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

      {/* The course already has a syllabus document. Attach/override replace
          it — say so plainly instead of letting the swap look like a first
          upload. */}
      {hasSyllabus && mode !== "create" ? (
        <ReplaceSyllabusWarning text={t(`${prefix}.replace_warning`)} />
      ) : null}

      {showModes ? (
        <Field
          label={t(`${prefix}.mode_label`)}
          hint={t(`${prefix}.mode_hint_${mode}`)}
        >
          <Select<SyllabusImportMode>
            value={mode}
            onValueChange={onModeChange}
            disabled={busy}
            options={modeOptions}
            aria-label={t(`${prefix}.mode_label`)}
          />
        </Field>
      ) : null}

      {/* Why "Override existing" is missing, said once, where it is missed.
          Silently short options read as a bug. */}
      {showModes && !canOverride ? (
        <p className="text-xs text-text-muted">
          {t(`${prefix}.override_blocked`, {
            status: t(`teacher_course_settings.status_${courseStatus}`, {
              defaultValue: courseStatus ?? "",
            }),
          })}
        </p>
      ) : null}

      {/* Language only matters when the document is PARSED. An attach stores
          the file as-is, so asking which language to read it in would be a
          question with no consequence. */}
      {mode === "attach" ? null : (
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
      )}

      {mode === "override" ? (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-900">
            {t(`${prefix}.override_warning`)}
          </p>
        </div>
      ) : null}

      {mode === "create" ? (
        <Field
          label={`Faculty${facultyRequired ? " *" : ""}`}
          hint="The owning faculty cannot be changed after import."
        >
          <Select
            value={facultyId}
            onValueChange={onFacultyChange}
            disabled={busy}
            placeholder={facultyRequired ? "Select faculty" : "Organization-wide"}
            options={facultyOptions}
            aria-label="Faculty"
          />
        </Field>
      ) : null}

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

function ImportResult({
  result,
  mode,
}: {
  result: SyllabusImportResult;
  mode: SyllabusImportMode;
}) {
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
          <p className="mt-1 text-xs text-text-muted">
            {t(`${prefix}.result_mode_${mode}`)}
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
