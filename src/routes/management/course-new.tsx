import { useEffect, useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { useMe } from "@/lib/api/hooks/auth";
import { useObjectUrl } from "@/lib/use-object-url";
import { usePermissions } from "@/lib/auth/use-permissions";
import {
  useFacultyAssignments,
  useOrgUnits,
} from "@/lib/api/hooks/admin-organizations";
import { CourseBasicsSection } from "./_components/course-new/BasicsSection";
import { CourseCardPreview } from "./_components/course-new/CardPreview";
import {
  CourseDetailsSection,
  CourseFormActions,
} from "./_components/course-new/DetailsSection";
import { DraftRestoreBanner } from "./_components/course-new/DraftRestoreBanner";
import { TeacherPickerSection } from "./_components/course-new/TeacherPickerSection";
import { ThumbnailField } from "./_components/course-new/ThumbnailField";
import { useCourseForm } from "./_components/course-new/use-course-form";
import {
  useCourseDraftGate,
  useCourseWizardState,
} from "./_components/course-new/use-course-wizard-state";

/**
 * Create a course, configure it, staff it and place it on a career path — all
 * on one screen.
 *
 * It used to take three: create here, open the course to fill in settings,
 * then open the dept page to assign a teacher. Everything `CourseCreate`
 * accepts (settings + contact) now ships in the same POST; teachers, the cover
 * image and the career-path placement follow as separate calls because they
 * are sub-resources of a course that cannot be addressed before it exists.
 *
 * That multi-request shape is why this screen persists a draft. Two distinct
 * crashes are covered (see `lib/course-draft.ts`), and critically a failure
 * AFTER the course row lands never causes a duplicate on retry: the created id
 * is recorded and the retry resumes from the step that failed.
 */
export default function ManagementCourseNewPage() {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const { pathId, stageId } = useSearch({ strict: false });

  const permissions = usePermissions();
  const canCreate = permissions.has("course.create");
  const gate = useCourseDraftGate();
  const controller = useCourseForm(false, gate.restored?.form);
  const { form, canSubmit } = controller;
  const faculties = useOrgUnits(me?.organization_id ?? undefined, { onlyRoots: true });
  const facultyAssignments = useFacultyAssignments(me?.organization_id ?? undefined);
  const facultyOptions = useMemo(() => {
    const assignedIds = new Set(
      (facultyAssignments.data ?? [])
        .filter((row) => row.user_id === me?.id)
        .map((row) => row.faculty_id),
    );
    const all = faculties.data ?? [];
    const visible = assignedIds.size > 0
      ? all.filter((faculty) => assignedIds.has(faculty.id))
      : all;
    return visible.map((faculty) => ({ value: faculty.id, label: faculty.name }));
  }, [faculties.data, facultyAssignments.data, me?.id]);
  const assignedFacultyCount = useMemo(
    () =>
      new Set(
        (facultyAssignments.data ?? [])
          .filter((row) => row.user_id === me?.id)
          .map((row) => row.faculty_id),
      ).size,
    [facultyAssignments.data, me?.id],
  );
  const canSubmitCourse =
    canSubmit && (assignedFacultyCount <= 1 || Boolean(form.facultyId));
  useEffect(() => {
    if (!form.facultyId && assignedFacultyCount === 1 && facultyOptions[0]) {
      controller.setField("facultyId", facultyOptions[0].value);
    }
  }, [assignedFacultyCount, controller, facultyOptions, form.facultyId]);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  // One blob URL for the picked file, shared by the picker and the card
  // preview so they cannot disagree about what was chosen.
  const thumbnailUrl = useObjectUrl(thumbnail);
  const wizard = useCourseWizardState(t, form, gate, pathId, stageId);

  if (permissions.isLoading) {
    return null;
  }

  if (!canCreate) {
    return <PermissionDenied />;
  }

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("dept_courses.title"), to: "/management/courses" },
          { label: t("teacher_course_new.title") },
        ]}
      />

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-headline font-bold text-m3-primary">
          {t("teacher_course_new.title")}
        </h1>
      </div>

      {gate.pendingDraft && (
        <DraftRestoreBanner
          draft={gate.pendingDraft}
          t={t}
          onRestore={gate.acceptDraft}
          onDiscard={gate.dismissDraft}
        />
      )}

      {/* Fluid two-column split rather than a fixed 320px rail on a capped
          page: the sidebar already varies between 64px and 256px, so a hard
          width left the form squeezed at some widths and stranded in
          whitespace at others. Both columns now scale with what is actually
          available. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!me || !canSubmitCourse || wizard.isRunning) return;
            void wizard.submit(form, thumbnail);
          }}
          className="bg-card ghost-border shadow-editorial rounded-xl p-6 space-y-6"
        >
          <CourseBasicsSection
            controller={controller}
            facultyOptions={facultyOptions}
            facultyRequired={assignedFacultyCount > 1}
            t={t}
          />

          <CourseDetailsSection controller={controller} t={t} />

          <ThumbnailField
            file={thumbnail}
            previewUrl={thumbnailUrl}
            onChange={setThumbnail}
            t={t}
          />

          {wizard.isRunning && wizard.currentStep && (
            <p className="flex items-center gap-2 text-xs text-m3-on-surface-variant">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t(`teacher_course_new.step_running.${wizard.currentStep}`)}
            </p>
          )}

          <CourseFormActions
            canSubmit={canSubmitCourse && !wizard.isRunning}
            isPending={wizard.isRunning}
            t={t}
          />
        </form>

        {/* Sticky right rail. `top-16` matches the ContentTopBar's h-16 (and
            the convention the other sticky rails in the app already use), and
            the max-height is viewport-relative so the rail scrolls internally
            instead of growing past the fold — a long instructor list would
            otherwise push its own bottom out of reach while the rail stays
            pinned. */}
        <div className="lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto space-y-6">
          <CourseCardPreview form={form} thumbnailUrl={thumbnailUrl} t={t} />
          <TeacherPickerSection controller={controller} t={t} />
        </div>
      </div>
    </div>
  );
}
