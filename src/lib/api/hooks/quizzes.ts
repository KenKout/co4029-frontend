/**
 * Public barrel for the quiz hooks. The implementation lives in
 * `./quizzes/*` — this file exists only to keep the historical import path
 * (`@/lib/api/hooks/quizzes`) and its exact public surface stable.
 *
 * There is deliberately NO `./quizzes/index.ts`: every submodule is imported
 * by explicit filename so this sibling module keeps resolving unambiguously.
 * Internal helpers (`./quizzes/helpers`) are intentionally not re-exported.
 */

export type {
  QuizIntegrityEvent,
  QuizIntegrityEventType,
  QuizIntegritySeverity,
} from "./quizzes/integrity";
export { useReportQuizIntegrityEvents } from "./quizzes/integrity";

export type {
  QuizAttemptProgressAnswer,
  QuizAttemptProgressRead,
} from "./quizzes/attempts";
export {
  useMyQuizAttempts,
  useQuizAttempt,
  useQuizAttemptProgress,
  useQuizAttemptReview,
  useStartQuizAttempt,
  useSubmitQuizAnswer,
  useSubmitQuizAttempt,
} from "./quizzes/attempts";

export type {
  QuizAttemptIntegrityEvent,
  QuizAttemptTeacherReview,
} from "./quizzes/teacher-attempts";
export {
  useCourseQuizAttemptDetail,
  useCourseQuizAttempts,
  useStudentQuizAttempts,
} from "./quizzes/teacher-attempts";

export {
  useCreateQuiz,
  useDeleteQuiz,
  usePatchQuiz,
  usePublishQuiz,
  useQuizAuthoring,
  useQuizResults,
  useStudentQuiz,
} from "./quizzes/quiz";

export {
  useAddQuizQuestion,
  useBulkApprove,
  useBulkSetExpectedTime,
  useDeleteQuizQuestion,
  useDuplicateQuizQuestion,
  useRegenerateQuestion,
  useUpdateQuizQuestion,
} from "./quizzes/questions";

export {
  useGenerateQuiz,
  useLatestQuizGenerationRun,
  useQuizGenerationRun,
} from "./quizzes/generation";

export {
  useCopyQuizQuestionsToCuratedBank,
  useCreateCuratedQuizQuestion,
  useCuratedQuizQuestionBank,
  useDeleteCuratedQuizQuestion,
  useImportCuratedQuizQuestions,
  useImportQuestionsFromBank,
  useQuestionBank,
  useSetCuratedQuizQuestionStatus,
  useUpdateCuratedQuizQuestion,
  type CopyToCuratedBankMutation,
} from "./quizzes/question-bank";

export type {
  PendingQuestionDelete,
  UsePendingQuestionDeletesResult,
} from "./quizzes/pending-deletes";
export { usePendingQuestionDeletes } from "./quizzes/pending-deletes";

export type {
  RegradeItemRead,
  RegradeRunRead,
  RegradeScopeIn,
} from "./quizzes/regrade";
export { useRegradeCommit, useRegradeDryRun } from "./quizzes/regrade";

export type {
  ManualGradeIn,
  NeedsGradingRow,
  QuizGradeRow,
} from "./quizzes/grading";
export {
  useGradeAnswer,
  useNeedsGrading,
  useQuizGradebook,
} from "./quizzes/grading";

export type {
  FeedbackBandIn,
  FeedbackBandRead,
  QuizOverrideIn,
  QuizOverrideRead,
  ReviewOptions,
  ReviewWindowFlags,
} from "./quizzes/settings";
export {
  useCreateOverride,
  useDeleteOverride,
  useFeedbackBands,
  useQuizOverrides,
  useSetFeedbackBands,
} from "./quizzes/settings";

export type {
  ResponsesReportRead,
  ResponsesReportRow,
  StatisticsReportRead,
  StatisticsReportRow,
} from "./quizzes/reports";
export {
  downloadQuizReport,
  useResponsesReport,
  useStatisticsReport,
} from "./quizzes/reports";

export type { ImportResult } from "./quizzes/import-export";
export {
  downloadQuizExport,
  useImportQuestionsFromFile,
} from "./quizzes/import-export";

export type { AuditEventRow } from "./quizzes/audit";
export { useQuizAuditEvents } from "./quizzes/audit";
