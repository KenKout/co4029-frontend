import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import {
  clearCourseDraft,
  draftIsRestorable,
  loadCourseDraft,
  saveCourseDraft,
  type CourseDraft,
} from "@/lib/course-draft";
import { slugify, type CourseFormValues } from "./use-course-form";
import { useCourseWizardRunner } from "./use-course-wizard";

const AUTOSAVE_MS = 500;

/**
 * Draft persistence + submit orchestration for the create-course screen.
 *
 * Split out of the page component so the page stays a layout: the page had
 * grown past the 150-line function cap, and the interesting logic here (when
 * to autosave, what a partial success means, where to navigate afterwards) is
 * worth reading on its own.
 */
export interface CourseDraftGate {
  /** A recovered draft awaiting the manager's decision, or null. */
  pendingDraft: CourseDraft | null;
  /** Values recovered from an accepted draft, seeded into the form. */
  restored: CourseDraft | null;
  setRestored: (draft: CourseDraft | null) => void;
  acceptDraft: () => void;
  dismissDraft: () => void;
}

/**
 * The draft decision, resolved BEFORE the form is constructed.
 *
 * Separate from the submit hook purely for ordering: `useCourseForm` seeds its
 * initial state from `restored`, and the submit hook needs the resulting form
 * values, so one hook cannot supply both.
 */
export function useCourseDraftGate(): CourseDraftGate {
  // Read the draft exactly once, before first paint, so the restore offer does
  // not flash in after the form has already rendered empty.
  const [pendingDraft, setPendingDraft] = useState<CourseDraft | null>(() => {
    const draft = loadCourseDraft();
    return draftIsRestorable(draft) ? draft : null;
  });
  const [restored, setRestored] = useState<CourseDraft | null>(null);

  return {
    pendingDraft,
    restored,
    setRestored,
    acceptDraft: () => {
      setRestored(pendingDraft);
      setPendingDraft(null);
    },
    dismissDraft: () => {
      // Explicitly wipe: leaving it on disk means the banner returns on the
      // next visit after the manager just said no.
      clearCourseDraft();
      setPendingDraft(null);
    },
  };
}

export interface CourseWizardState {
  submit: (form: CourseFormValues, thumbnail: File | null) => Promise<void>;
  isRunning: boolean;
  currentStep: string | null;
}

export function useCourseWizardState(
  t: TFunction,
  form: CourseFormValues,
  gate: CourseDraftGate,
  pathId?: string,
  stageId?: string,
): CourseWizardState {
  const navigate = useNavigate();
  const runner = useCourseWizardRunner(t);
  const { pendingDraft, restored, setRestored } = gate;

  const bannerOpen = pendingDraft !== null;
  const restoredRef = useRef(restored);
  restoredRef.current = restored;

  // Debounced autosave of everything typed so far. Suspended while the submit
  // sequence runs — the runner writes its own progress records and must not
  // race with this one — and while the restore banner is open, so an untouched
  // form cannot overwrite the very draft being offered.
  useEffect(() => {
    if (runner.isRunning || bannerOpen) return;
    const id = window.setTimeout(() => {
      const current = restoredRef.current;
      saveCourseDraft({
        form,
        courseId: current?.courseId,
        done: current?.done ?? [],
        pathId,
        stageId,
      });
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(id);
  }, [form, runner.isRunning, bannerOpen, pathId, stageId]);

  /**
   * The course EXISTS and is missing pieces.
   *
   * Naming what did not land beats a generic failure: a manager told
   * "creation failed" goes and creates a second course, which is the outcome
   * this whole design avoids. The resume state is held so pressing the button
   * again continues from the failed step rather than starting over.
   */
  function handlePartialSuccess(
    values: CourseFormValues,
    courseId: string,
    failed: string[],
  ): void {
    toast.warning(
      t("teacher_course_new.partial_success", {
        steps: failed
          .map((step) => t(`teacher_course_new.step.${step}`))
          .join(", "),
      }),
    );
    // `done` is read back from the draft the runner just wrote — it holds
    // every step that DID land. Hardcoding an empty list would throw that
    // progress away and make the retry redo work that already succeeded.
    const persisted = loadCourseDraft();
    setRestored({
      form: values,
      courseId,
      done: persisted?.done ?? [],
      pathId,
      stageId,
      savedAt: Date.now(),
    });
  }

  async function submit(
    values: CourseFormValues,
    thumbnail: File | null,
  ): Promise<void> {
    const current = restoredRef.current;
    const result = await runner.run({
      form: { ...values, slug: values.slug || slugify(values.title) },
      thumbnail,
      pathId: current?.pathId ?? pathId,
      stageId: current?.stageId ?? stageId,
      done: current?.done ?? [],
      courseId: current?.courseId,
    });
    if (!result) return; // create failed; the runner already explained why

    if (result.failed.length > 0) {
      handlePartialSuccess(values, result.courseId, result.failed);
      await navigate({
        to: "/management/courses/$courseId",
        params: { courseId: result.courseId },
      });
      return;
    }

    toast.success(t("teacher_course_new.created"));
    const returnToPath = current?.pathId ?? pathId;
    if (returnToPath) {
      await navigate({
        to: "/management/career-paths/$id",
        params: { id: returnToPath },
      });
      return;
    }
    await navigate({
      to: "/management/courses/$courseId",
      params: { courseId: result.courseId },
    });
  }

  return {
    submit,
    isRunning: runner.isRunning,
    currentStep: runner.currentStep,
  };
}
