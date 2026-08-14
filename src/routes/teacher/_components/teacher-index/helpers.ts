import {
  ClipboardCheck,
  Clock,
  FileEdit,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import type { TeacherDashboardStats } from "@/lib/api/hooks/teacher-courses";

import type { ReviewCandidate, TranslateFn } from "./types";

export function formatCount(n: number | undefined | null): string {
  return n === undefined || n === null ? "—" : String(n);
}

/**
 * Quiz cards + interview questions are both AI-generated content awaiting a
 * human decision, so the headline tile combines them; the queue below breaks
 * them out.
 */
export function countCardsAwaitingReview(
  stats: TeacherDashboardStats | undefined,
): number {
  return (
    (stats?.quiz_cards_pending_review ?? 0) +
    (stats?.interview_questions_pending_review ?? 0)
  );
}

/**
 * Review queue, built as data so zero-count rows can be filtered out rather
 * than rendered as already-done.
 */
export function buildReviewCandidates(
  stats: TeacherDashboardStats | undefined,
  t: TranslateFn,
): ReviewCandidate[] {
  return [
    {
      key: "quiz_cards",
      kind: "quiz-cards" as const,
      label: t("teacher_dashboard.review.quiz_cards"),
      count: stats?.quiz_cards_pending_review ?? 0,
      hint: t("teacher_dashboard.review.quiz_cards_hint"),
      icon: ClipboardCheck,
      to: "/teacher/courses",
      tone: "amber",
    },
    {
      key: "interview_questions",
      kind: "interview-questions" as const,
      label: t("teacher_dashboard.review.interview_questions"),
      count: stats?.interview_questions_pending_review ?? 0,
      hint: t("teacher_dashboard.review.interview_questions_hint"),
      icon: MessageSquare,
      to: "/teacher/courses",
      tone: "violet",
    },
    {
      key: "missing_texp",
      label: t("teacher_dashboard.review.missing_texp"),
      count: stats?.published_quizzes_missing_texp ?? 0,
      hint: t("teacher_dashboard.review.missing_texp_hint"),
      icon: Clock,
      to: "/teacher/courses",
      tone: "amber",
    },
    {
      key: "materials_ready",
      kind: "materials" as const,
      label: t("teacher_dashboard.review.materials_ready"),
      count: stats?.materials_ready_for_quiz_gen ?? 0,
      hint: t("teacher_dashboard.review.materials_ready_hint"),
      icon: Sparkles,
      to: "/teacher/courses",
      tone: "sky",
    },
    {
      key: "ungraded",
      label: t("teacher_dashboard.review.ungraded_quizzes"),
      count: stats?.ungraded_quizzes ?? 0,
      icon: FileEdit,
      to: "/teacher/courses",
      tone: "amber",
    },
    {
      key: "pending_interviews",
      label: t("teacher_dashboard.review.pending_interviews"),
      count: stats?.pending_interviews ?? 0,
      icon: MessageSquare,
      to: "/teacher/courses",
      tone: "violet",
    },
  ];
}
