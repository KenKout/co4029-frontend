import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Tabs } from "@/components/ui/tabs";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import {
  useDeleteInterviewQuestionBankGroup,
  useDeleteInterviewQuestionBankItem,
  useInterviewQuestionBank,
  useUpdateInterviewQuestionBankItem,
} from "@/lib/api/hooks/interviews";
import { DeleteQuestionDialog } from "./_components/course-question-bank/DeleteQuestionDialog";
import { QuestionBankBody } from "./_components/course-question-bank/QuestionBankBody";
import { QuestionBankFilters } from "./_components/course-question-bank/QuestionBankFilters";
import { QuestionBankHeader } from "./_components/course-question-bank/QuestionBankHeader";
import { QuestionBankStats } from "./_components/course-question-bank/QuestionBankStats";
import { QuizQuestionBankPanel } from "./_components/course-question-bank/QuizQuestionBankPanel";
import { useQuestionBankDeletion } from "./_components/course-question-bank/use-question-bank-deletion";
import { useQuestionBankDerived } from "./_components/course-question-bank/use-question-bank-derived";
import { useQuestionBankEditor } from "./_components/course-question-bank/use-question-bank-editor";
import { useQuestionBankFilters } from "./_components/course-question-bank/use-question-bank-filters";
import { useQuestionBankViewState } from "./_components/course-question-bank/use-question-bank-view-state";

/**
 * Course-level Question Bank management page (§QBank-2). Browse / search /
 * filter / edit / delete / tag the course-scoped interview question bank in
 * one place. Adding to the bank still happens from inside interview configs
 * ("Add to question bank"); this page is the management surface over the pool.
 *
 * Thin orchestrator: data fetching, state wiring and composition only. Every
 * piece of the surface lives in `_components/course-question-bank/`.
 */
export default function CourseQuestionBankPage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const { data: course } = useTeacherCourseById(courseId);
  const { data: items, isLoading } = useInterviewQuestionBank(courseId);
  const updateItem = useUpdateInterviewQuestionBankItem(courseId);
  const deleteItem = useDeleteInterviewQuestionBankItem(courseId);
  const deleteGroup = useDeleteInterviewQuestionBankGroup(courseId);

  const filters = useQuestionBankFilters();
  const editor = useQuestionBankEditor({ t, updateItem });
  const deletion = useQuestionBankDeletion({ t, deleteItem, deleteGroup });
  const view = useQuestionBankViewState();
  const derived = useQuestionBankDerived({ items, filters });
  const [bankType, setBankType] = useState<"quiz" | "interview">("quiz");

  const controllers = { filters, editor, deletion, view };

  return (
    <div className="w-full py-6 space-y-5">
      <QuestionBankHeader course={course} />

      <Tabs
        tabs={[
          { key: "quiz", label: "Quiz questions" },
          { key: "interview", label: "Interview questions" },
        ]}
        value={bankType}
        onChange={setBankType}
        variant="contained"
        ariaLabel="Question bank type"
      />

      {bankType === "quiz" ? (
        <QuizQuestionBankPanel courseId={courseId} />
      ) : null}

      {/* ── 12-col grid: question list main + sticky stats/help sidebar ── */}
      {bankType === "interview" ? (
        <div className="grid grid-cols-12 gap-6">
          {/* ── Main 8 cols ── */}
          <div className="col-span-12 lg:col-span-8 space-y-5 min-w-0">
            {/* Filters */}
            {derived.hasItems && (
              <QuestionBankFilters filters={filters} derived={derived} />
            )}

            {/* Body */}
            <QuestionBankBody
              isLoading={isLoading}
              derived={derived}
              controllers={controllers}
            />
          </div>

          {/* ── Sidebar 4 cols ── */}
          <div className="col-span-12 lg:col-span-4 space-y-5 lg:sticky lg:top-24 self-start">
            {derived.hasItems && (
              <QuestionBankStats
                derived={derived}
                className="lg:grid-cols-1"
              />
            )}
          </div>
        </div>
      ) : null}

      {bankType === "interview" ? (
        <DeleteQuestionDialog deletion={deletion} />
      ) : null}
    </div>
  );
}
