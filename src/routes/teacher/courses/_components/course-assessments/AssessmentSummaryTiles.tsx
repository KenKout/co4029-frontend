import {
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { useTranslation } from "react-i18next";

import type { CourseAssessmentsController } from "./use-course-assessments-controller";

/**
 * The four summary tiles above the Assessments tabs — students assessed, quiz
 * attempts, quiz pass rate and interview sessions.
 */
export function AssessmentSummaryTiles({
  controller,
  className,
}: {
  controller: CourseAssessmentsController;
  className?: string;
}) {
  const { t } = useTranslation();
  const {
    distinctStudents,
    quizAttemptCount,
    quizPassRate,
    interviewSessionCount,
    summaryLoading,
  } = controller;
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      <StatCard
        icon={Users}
        label={t("teacher_assessments.metrics.students")}
        value={summaryLoading ? "—" : distinctStudents}
        interactive={false}
        className="p-4"
      />
      <StatCard
        icon={ClipboardList}
        label={t("teacher_assessments.metrics.quiz_attempts")}
        value={summaryLoading ? "—" : quizAttemptCount}
        interactive={false}
        className="p-4"
      />
      <StatCard
        icon={CheckCircle2}
        label={t("teacher_assessments.metrics.pass_rate")}
        value={
          summaryLoading
            ? "—"
            : quizPassRate != null
              ? `${quizPassRate.toFixed(0)}%`
              : "—"
        }
        interactive={false}
        className="p-4"
      />
      <StatCard
        icon={MessageSquare}
        label={t("teacher_assessments.metrics.interviews")}
        value={summaryLoading ? "—" : interviewSessionCount}
        interactive={false}
        className="p-4"
      />
    </div>
  );
}
