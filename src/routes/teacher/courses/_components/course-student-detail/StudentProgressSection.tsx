import { GradientProgress } from "@/components/ui/gradient-progress";
import type { RosterStudent } from "@/lib/api/types/teacher";

/**
 * "Course Progress" section — overall completion bar plus the one-line
 * interpretation underneath. Extracted verbatim from the former 659-line
 * course-student-detail.tsx.
 */
export function StudentProgressSection({
  student,
}: {
  student: RosterStudent;
}) {
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-5">
      <h2 className="font-headline font-bold text-lg text-m3-on-surface">
        Course Progress
      </h2>

      <div className="space-y-3">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-m3-on-surface">Overall completion</span>
          <span className="font-bold text-m3-primary">
            {Math.round(student.progress_percent)}%
          </span>
        </div>
        <GradientProgress
          value={student.progress_percent}
          size="lg"
          variant={student.progress_percent >= 100 ? "success" : "primary"}
        />
        <p className="text-xs text-m3-on-surface-variant">
          {student.progress_percent === 0
            ? "Student has not started this course yet."
            : student.progress_percent >= 100
              ? "Course completed."
              : `${Math.round(student.progress_percent)}% of course content completed.`}
        </p>
      </div>
    </section>
  );
}
