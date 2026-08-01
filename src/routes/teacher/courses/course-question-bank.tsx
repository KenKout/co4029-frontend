import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import {
  useDeleteInterviewQuestionBankItem,
  useInterviewQuestionBank,
  useUpdateInterviewQuestionBankItem,
} from "@/lib/api/hooks/interviews";
import { DeleteQuestionDialog } from "./_components/course-question-bank/DeleteQuestionDialog";
import { HelpPanel } from "./_components/course-question-bank/HelpPanel";
import { QuestionBankBody } from "./_components/course-question-bank/QuestionBankBody";
import { QuestionBankFilters } from "./_components/course-question-bank/QuestionBankFilters";
import { QuestionBankHeader } from "./_components/course-question-bank/QuestionBankHeader";
import { QuestionBankStats } from "./_components/course-question-bank/QuestionBankStats";
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

  // Hook order below matches the pre-split page exactly: the four filter
  // states, then editing, then deletion, then the disclosure state, then the
  // four derived memos.
  const filters = useQuestionBankFilters();
  const editor = useQuestionBankEditor({ t, updateItem });
  const deletion = useQuestionBankDeletion({ t, deleteItem });
  const view = useQuestionBankViewState();
  const derived = useQuestionBankDerived({ items, filters });

  const controllers = { filters, editor, deletion, view };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-5">
      <QuestionBankHeader course={course} view={view} />

      <HelpPanel helpOpen={view.helpOpen} />

      {derived.hasItems && <QuestionBankStats derived={derived} />}

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

      <DeleteQuestionDialog deletion={deletion} />
    </div>
  );
}
