import {
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Users,
} from "lucide-react";

import { SummaryTile } from "./SummaryTile";
import type { CourseAssessmentsController } from "./use-course-assessments-controller";

/**
 * The four summary tiles above the Assessments tabs — students assessed, quiz
 * attempts, quiz pass rate and interview sessions. Extracted verbatim from the
 * former 458-line course-assessments.tsx.
 */
export function AssessmentSummaryTiles({
  controller,
}: {
  controller: CourseAssessmentsController;
}) {
  const {
    distinctStudents,
    quizAttempts,
    quizzesLoading,
    quizPassRate,
    interviewSessions,
    interviewsLoading,
  } = controller;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SummaryTile
        icon={Users}
        label="Students assessed"
        value={distinctStudents}
        loading={quizzesLoading || interviewsLoading}
      />
      <SummaryTile
        icon={ClipboardList}
        label="Quiz attempts"
        value={quizAttempts?.length ?? 0}
        loading={quizzesLoading}
      />
      <SummaryTile
        icon={CheckCircle2}
        label="Quiz pass rate"
        value={quizPassRate != null ? `${quizPassRate.toFixed(0)}%` : "—"}
        loading={quizzesLoading}
        tone="emerald"
      />
      <SummaryTile
        icon={MessageSquare}
        label="Interview sessions"
        value={interviewSessions?.length ?? 0}
        loading={interviewsLoading}
      />
    </div>
  );
}
