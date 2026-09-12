import type { QuizAuthoring } from "@/lib/api/types";
import { draftFromQuiz } from "../helpers";

export const quizFixture = {
  id: "quiz-1", course_id: "course-1", module_id: "module-1", title: "Quiz", description: "",
  status: "draft", passing_score_percent: "72.25", time_limit_seconds: 90,
  allow_retakes: true, max_attempts: 3, shuffle_questions: true, shuffle_options: true,
  show_hints: false, reminders_enabled: false,
} as QuizAuthoring;
export const settingsFixture = () => draftFromQuiz(quizFixture);
