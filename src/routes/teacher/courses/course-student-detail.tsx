import { AtRiskAlert } from "./_components/course-student-detail/AtRiskAlert";
import {
  ENROLL_META,
  RISK_META,
} from "./_components/course-student-detail/constants";
import { EnrollmentManagementCard } from "./_components/course-student-detail/EnrollmentManagementCard";
import { EnrollmentTimeline } from "./_components/course-student-detail/EnrollmentTimeline";
import { StudentBreadcrumb } from "./_components/course-student-detail/StudentBreadcrumb";
import {
  StudentDetailLoading,
  StudentNotFound,
} from "./_components/course-student-detail/StudentDetailStates";
import { StudentInterviewSection } from "./_components/course-student-detail/StudentInterviewSection";
import { StudentNavigateCard } from "./_components/course-student-detail/StudentNavigateCard";
import { StudentProfileHero } from "./_components/course-student-detail/StudentProfileHero";
import { StudentProgressSection } from "./_components/course-student-detail/StudentProgressSection";
import { StudentQuizAttemptsSection } from "./_components/course-student-detail/StudentQuizAttemptsSection";
import { useCourseStudentDetailController } from "./_components/course-student-detail/use-course-student-detail-controller";

/**
 * Per-student profile inside a course: progress, every quiz attempt and
 * interview session, the enrolment timeline, and a sticky sidebar of
 * enrolment/risk detail.
 *
 * Thin orchestrator: queries and interview filters live in
 * `useCourseStudentDetailController`, every piece of the surface in
 * `_components/course-student-detail/`.
 */
export default function CourseStudentDetailPage() {
  const controller = useCourseStudentDetailController();
  const { courseId, course, isLoading, student } = controller;

  if (isLoading) {
    return <StudentDetailLoading />;
  }

  if (!student) {
    return <StudentNotFound courseId={courseId} />;
  }

  const risk = RISK_META[student.at_risk_level] ?? RISK_META.none;
  const enroll = ENROLL_META[student.enrollment_status] ?? ENROLL_META.active;

  return (
    <div className="max-w-[1440px] mx-auto pb-16">
      {/* ── Breadcrumb ── */}
      <StudentBreadcrumb
        courseId={courseId}
        course={course}
        studentName={student.display_name}
      />

      {/* ── Profile hero card ── */}
      <StudentProfileHero
        student={student}
        courseId={courseId}
        risk={risk}
        enroll={enroll}
      />

      {/* ── 12-col grid ── */}
      <div className="grid grid-cols-12 gap-6">
        {/* ── Main 8 cols ── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <StudentProgressSection student={student} />
          <StudentQuizAttemptsSection controller={controller} />
          <StudentInterviewSection controller={controller} />
          <EnrollmentTimeline student={student} />
        </div>

        {/* ── Sidebar 4 cols ── */}
        <div className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-24 self-start">
          <EnrollmentManagementCard
            student={student}
            risk={risk}
            enroll={enroll}
          />

          {/* At-risk alert */}
          {(student.at_risk_level === "medium" ||
            student.at_risk_level === "high") && (
            <AtRiskAlert student={student} />
          )}

          {/* Navigate back */}
          <StudentNavigateCard courseId={courseId} />
        </div>
      </div>
    </div>
  );
}
