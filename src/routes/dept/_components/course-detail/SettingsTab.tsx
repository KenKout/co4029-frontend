import { CourseSettingsPanel } from "@/routes/teacher/_components/course-manage/CourseSettingsPanel";
import { LearningOutcomesPanel } from "@/routes/teacher/_components/course-manage/LearningOutcomesPanel";
import { ReadinessChecklist } from "./ReadinessChecklist";

/**
 * Manager-owned course configuration: identity (title/slug), lifecycle
 * (status), delivery policy (level, caps, thumbnail) and the learning
 * outcomes.
 *
 * These panels used to live on the teacher course workspace. They moved here
 * because the permissions always said this is where they belong: title/slug
 * and status need `course.delete`, and learning outcomes need
 * `learning_outcome.manage` with the owner short-circuit disabled — none of
 * which a teacher holds. On the teacher surface every Save of these fields
 * could only 403.
 *
 * The panels are shared with the teacher workspace; `scope="manager"` is what
 * widens them from the teacher's six fields to the full set.
 *
 * Layout: editing on the left, reference on the right.
 *
 * The tab used to be a single full-width column of three stacked panels,
 * two of them collapsed by default. On arrival that meant a 950px viewport
 * showing a short checklist and two clickable rows — measured at ~350px of
 * content, the rest empty — and once expanded the form ran to 1329px-wide
 * inputs, which is far past a comfortable line length for a text field.
 *
 * Both panels now start expanded, because here they ARE the page rather
 * than one section among many (on the teacher workspace they stay
 * collapsed, where the modules are the point). Readiness moves to a sticky
 * rail: it is reference you check WHILE editing, not a step you complete
 * first, and it gives the right-hand column something permanent to hold.
 */
export function DeptSettingsTab({
  active,
  courseId,
}: {
  active: boolean;
  courseId: string;
}) {
  if (!active) return null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-4">
        <CourseSettingsPanel courseId={courseId} scope="manager" defaultOpen />
        <LearningOutcomesPanel courseId={courseId} defaultOpen />
      </div>

      <aside className="lg:sticky lg:top-6">
        <ReadinessChecklist courseId={courseId} />
      </aside>
    </div>
  );
}
