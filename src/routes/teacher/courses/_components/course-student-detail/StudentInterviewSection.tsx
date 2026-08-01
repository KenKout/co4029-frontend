import { MessageSquare } from "lucide-react";

import { InterviewSessionsTable } from "@/routes/teacher/_components/assessment-tables";

import { InterviewFilterBar } from "./InterviewFilterBar";
import type { CourseStudentDetailController } from "./use-course-student-detail-controller";

/**
 * "Interview Attempts" section — header, the three filter dropdowns and the
 * shared InterviewSessionsTable drilling into the gap report. Extracted
 * verbatim from the former 659-line course-student-detail.tsx.
 */
export function StudentInterviewSection({
  controller,
}: {
  controller: CourseStudentDetailController;
}) {
  const { filters, interviewSessionsLoading, navigate } = controller;
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-m3-secondary" />
          <h2 className="font-headline font-bold text-lg text-m3-on-surface">
            Interview Attempts
          </h2>
        </div>
        {/* Filters: Interview / Result / Time — mirror the course
            Assessments page so teachers get the same controls here. */}
        <InterviewFilterBar filters={filters} />
      </div>
      <InterviewSessionsTable
        sessions={filters.filteredInterviewSessions}
        loading={interviewSessionsLoading}
        showStudentColumn={false}
        onRowClick={(s) =>
          void navigate({
            to: "/teacher/interview-sessions/$sessionId/gap-report",
            params: { sessionId: s.session_id },
          })
        }
      />
    </section>
  );
}
