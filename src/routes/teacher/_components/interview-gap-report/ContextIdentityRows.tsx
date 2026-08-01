import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type {
  GapReportAuthoringRead,
  InterviewSessionPublic,
} from "@/lib/api/types";
import { ContextRow } from "./ContextRow";

/**
 * Who / what / which attempt — the identity half of the context grid. Returns a
 * fragment so the rows stay direct children of the grid.
 */
export function ContextIdentityRows({
  report,
  session,
}: {
  report: GapReportAuthoringRead;
  session: InterviewSessionPublic | null;
}) {
  const { t } = useTranslation();
  return (
    <>
      {report.student_name && (
        <ContextRow
          label={t("teacher_interview_gap_report.labels.student")}
          value={
            report.course_id && report.student_id ? (
              <Link
                to="/teacher/courses/$courseId/students/$studentId"
                params={{
                  courseId: report.course_id,
                  studentId: report.student_id,
                }}
                className="text-m3-primary underline decoration-m3-primary/30 underline-offset-2 transition-colors hover:decoration-m3-primary hover:text-m3-primary/80"
              >
                {report.student_name}
              </Link>
            ) : (
              report.student_name
            )
          }
        />
      )}
      {(report.interview_title || session?.interview_title) && (
        <ContextRow
          label={t("teacher_interview_gap_report.labels.interview")}
          value={report.interview_title || session?.interview_title}
        />
      )}
      {session?.attempt_number != null && (
        <ContextRow
          label={t("teacher_interview_gap_report.labels.attempt")}
          value={t("teacher_interview_gap_report.labels.attempt_value", {
            n: session.attempt_number,
          })}
        />
      )}
    </>
  );
}
