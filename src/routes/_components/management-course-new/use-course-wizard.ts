import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import { apiPost } from "@/lib/api/client";
import { authenticatedFetch } from "@/lib/auth";
import { queryKeys } from "@/lib/api/query-keys";
import { useCreateCourse } from "@/lib/api/hooks/teacher-courses";
import type { CourseAuthoring, CourseTeacherRole } from "@/lib/api/types";
import {
  clearCourseDraft,
  saveCourseDraft,
  type CourseDraftForm,
  type DoneStep,
  type TeacherStep,
  type WizardStep,
} from "@/lib/course-draft";

/**
 * Runs the create-course wizard's submit as a RESUMABLE sequence.
 *
 * Only the course row is creatable in one request; teachers, the cover image
 * and the career-path placement are sub-resources of `/courses/{id}/...` and
 * cannot be addressed until the course exists. So "all in one screen" is one
 * form over several requests, and the interesting question is what happens
 * when request #3 of 4 fails.
 *
 * The rule here: **never re-create a course that already exists.** Once the
 * POST lands, its id and every completed step are written to the draft
 * immediately. A retry — same click, a reload, or the tab reopened tomorrow —
 * resumes at the first unfinished step. Without that, a manager whose network
 * blipped during teacher assignment produces a duplicate course by pressing
 * the button again, which is a worse outcome than the original failure.
 *
 * Partial success is reported as partial success. The course genuinely exists
 * and is genuinely missing a teacher; saying "creation failed" would be a lie
 * that invites exactly the duplicate this guards against.
 */

export interface WizardRunInput {
  form: CourseDraftForm;
  thumbnail: File | null;
  pathId?: string;
  stageId?: string;
  /** Steps already completed by an earlier attempt. */
  done: DoneStep[];
  /** Course id from an earlier attempt, if the POST already succeeded. */
  courseId?: string;
}

export interface WizardRunResult {
  courseId: string;
  /** Steps that failed; empty means everything landed. */
  failed: WizardStep[];
}

export interface CourseWizardRunner {
  run: (input: WizardRunInput) => Promise<WizardRunResult | null>;
  isRunning: boolean;
  /** Which step is in flight, for the progress display. */
  currentStep: WizardStep | null;
}

function toNumberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function trimmedOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** Everything `CourseCreate` accepts, so settings ship in the create request. */
function buildCreatePayload(form: CourseDraftForm) {
  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    description: trimmedOrUndefined(form.description),
    estimated_minutes: toNumberOrUndefined(form.estimated_minutes),
    enrollment_cap: toNumberOrUndefined(form.enrollment_cap),
    // No contact_* here: those are the teacher's own details, filled in from
    // the course settings panel once assigned.
  };
}

/** Raw bytes as the PUT body — the backend reads request.body(), no multipart. */
async function uploadThumbnail(courseId: string, file: File): Promise<void> {
  const response = await authenticatedFetch(
    `/teacher/courses/${courseId}/thumbnail`,
    {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    },
  );
  if (!response.ok) throw new Error(response.statusText);
}

/**
 * Assign each teacher separately, recording every success on its own.
 *
 * Each assignment carries the manager-chosen course-scoped title (CI vs TA);
 * the first teacher is forced to Course Instructor server-side regardless, so
 * the client just forwards the pick. An attempt that assigns three of five and
 * then dies must not re-assign those three when it resumes, so the marker is
 * per user id rather than one flag for the whole group.
 */
async function assignTeachers(
  courseId: string,
  teacherIds: string[],
  roles: Record<string, CourseTeacherRole | undefined>,
  done: Set<DoneStep>,
  persist: (courseId: string) => void,
): Promise<boolean> {
  let allAssigned = true;
  for (const userId of teacherIds) {
    const stepKey: TeacherStep = `teacher:${userId}`;
    if (done.has(stepKey)) continue;
    try {
      await apiPost(`/dept/courses/${courseId}/teachers`, {
        user_id: userId,
        course_role: roles[userId],
      });
      done.add(stepKey);
      persist(courseId);
    } catch {
      allAssigned = false;
    }
  }
  return allAssigned;
}

/**
 * Caches the skipped mutation hooks would have refreshed.
 *
 * The sub-resource calls go through the api client directly (their hooks bind
 * an id that does not exist yet), so their `onSuccess` never ran — without
 * this the course page shows no teachers until a manual reload.
 */
function invalidateAfterRun(
  qc: ReturnType<typeof useQueryClient>,
  courseId: string,
  pathId?: string,
): void {
  void qc.invalidateQueries({ queryKey: queryKeys.dept.courses() });
  void qc.invalidateQueries({ queryKey: queryKeys.dept.teachers(courseId) });
  void qc.invalidateQueries({ queryKey: queryKeys.dept.readiness(courseId) });
  void qc.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
  if (pathId) {
    void qc.invalidateQueries({
      queryKey: queryKeys.careerPaths.managementCourses(pathId),
    });
    void qc.invalidateQueries({
      queryKey: queryKeys.careerPaths.managementDetail(pathId),
    });
  }
}

export function useCourseWizardRunner(t: TFunction): CourseWizardRunner {
  const createCourse = useCreateCourse();
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep | null>(null);

  // The existing mutation hooks (useAssignTeacher, useUploadCourseThumbnail,
  // useAddCareerPathCourse) all bind their id at HOOK-CREATION time, and the
  // course id here does not exist until step 1 has run. Rather than mount them
  // with a placeholder id and hope, the sub-resource calls go through the api
  // client directly and the cache is invalidated explicitly below.
  const qc = useQueryClient();

  const run = useCallback(
    // This is the multi-step course-creation state machine (create -> thumb ->
    // teachers -> enroll), each step its own try/catch resumable unit. Its
    // branch count is inherent to the orchestration; keep the per-step logic
    // in helpers rather than flattening it.
    // eslint-disable-next-line complexity
    async (input: WizardRunInput): Promise<WizardRunResult | null> => {
      const { form, thumbnail, pathId, stageId } = input;
      const done = new Set<DoneStep>(input.done);
      const failed: WizardStep[] = [];
      setIsRunning(true);

      // Persist progress after every step, not at the end: the whole point is
      // to survive the process dying between two requests.
      const persist = (courseId: string) => {
        saveCourseDraft({
          form,
          courseId,
          done: [...done],
          pathId,
          stageId,
        });
      };

      try {
        // ---- Step 1: the course row itself ---------------------------------
        // Skipped entirely when a previous attempt already created it. This is
        // the anti-duplicate guarantee.
        let courseId = input.courseId;
        if (!courseId) {
          setCurrentStep("create");
          try {
            const course: CourseAuthoring = await createCourse.mutateAsync(
              buildCreatePayload(form),
            );
            courseId = course.id;
            done.add("create");
            persist(courseId);
          } catch (err: unknown) {
            // Nothing exists yet, so this is the one clean failure: the draft
            // keeps the typed values and the manager can simply retry.
            toast.error(
              (err as Error).message || t("teacher_course_new.create_failed"),
            );
            return null;
          }
        }

        // ---- Step 2: cover image -------------------------------------------
        if (thumbnail && !done.has("thumbnail")) {
          setCurrentStep("thumbnail");
          try {
            await uploadThumbnail(courseId, thumbnail);
            done.add("thumbnail");
          } catch {
            failed.push("thumbnail");
          }
          persist(courseId);
        }

        // ---- Step 3: teachers ----------------------------------------------
        if (form.teacherIds.length > 0 && !done.has("teachers")) {
          setCurrentStep("teachers");
          const allAssigned = await assignTeachers(
            courseId,
            form.teacherIds,
            form.teacherRoles ?? {},
            done,
            persist,
          );
          if (allAssigned) done.add("teachers");
          else failed.push("teachers");
          persist(courseId);
        }

        // ---- Step 4: attach to the career-path stage ------------------------
        if (pathId && stageId && !done.has("attachToStage")) {
          setCurrentStep("attachToStage");
          try {
            await apiPost(`/management/career-paths/${pathId}/courses`, {
              stage_id: stageId,
              course_id: courseId,
              is_required: true,
            });
            done.add("attachToStage");
          } catch {
            failed.push("attachToStage");
          }
          persist(courseId);
        }

        invalidateAfterRun(qc, courseId, pathId);

        // Only a fully clean run may drop the draft. Anything left unfinished
        // stays on disk so the retry can resume instead of re-creating.
        if (failed.length === 0) clearCourseDraft();

        return { courseId, failed };
      } finally {
        setIsRunning(false);
        setCurrentStep(null);
      }
    },
    [createCourse, qc, t],
  );

  return { run, isRunning, currentStep };
}
