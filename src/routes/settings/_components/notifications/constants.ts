import type {
  NotificationCategory,
  NotificationChannel,
} from "@/lib/api/types";

export const CATEGORY_IDS: NotificationCategory[] = [
  "spaced_repetition",
  "lesson_unlock",
  "interview_result",
  "course_announcement",
  "system",
  "material_processing",
  "quiz_generation",
  "interview_generation",
  "path_change_review",
];

export const CHANNEL_IDS: NotificationChannel[] = ["email", "in_app"];
