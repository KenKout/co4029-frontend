import { CourseSettingsPanel } from "@/routes/teacher/_components/course-manage/CourseSettingsPanel";
import { LearningOutcomesPanel } from "@/routes/teacher/_components/course-manage/LearningOutcomesPanel";

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
    <div className="space-y-4">
      <CourseSettingsPanel courseId={courseId} scope="manager" />
      <LearningOutcomesPanel courseId={courseId} />
    </div>
  );
}
