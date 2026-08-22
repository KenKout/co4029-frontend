import type { RefObject } from "react";
import type { Course, Notification } from "@/lib/api/types";
import type { SrDashboardSummary } from "@/lib/api/hooks/spaced-repetition";

/**
 * Shared types for the student dashboard, extracted from `dashboard.tsx` so the
 * section components take one controller object each instead of a long tail of
 * scalars.
 */

export interface SrSummaryView {
  srLoading: boolean;
  sr: SrDashboardSummary | undefined;
}

export interface CoursesSectionController {
  carouselRef: RefObject<HTMLDivElement | null>;
  coursesLoading: boolean;
  enrolledCount: number;
  visibleCourses: Course[];
  scrollCarousel: (direction: "left" | "right") => void;
}

export interface NotificationsSectionController {
  notifications: Notification[];
  notificationsLoading: boolean;
  unreadCount: number;
}
