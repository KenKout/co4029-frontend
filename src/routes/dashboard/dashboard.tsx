import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMyCourses } from "@/lib/api/hooks/courses";
import { useMyLearningPrograms } from "@/lib/api/hooks/learning-programs";
import { useNotifications } from "@/lib/api/hooks/notifications";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AuthenticatedAvatarImage } from "@/components/auth/AuthenticatedAvatarImage";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { useSrDashboardSummary } from "@/lib/api/hooks/spaced-repetition";
import { getAuthDisplayName, getAuthUserInitials } from "@/lib/auth";
import {
  ChoosePathPrompt,
  LearningPlanSection,
} from "./_components/dashboard/ChoosePathPrompt";
import DashboardStatsSection from "./_components/dashboard/DashboardStatsSection";
import MyCoursesSection from "./_components/dashboard/MyCoursesSection";
import NotificationsSection from "./_components/dashboard/NotificationsSection";
import ReadyCtaSection from "./_components/dashboard/ReadyCtaSection";
import {
  StudentPage,
  StudentPageHeader,
} from "@/components/layout/StudentPage";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const carouselRef = useRef<HTMLDivElement>(null);

  const {
    items: myCourses,
    isLoading: coursesLoading,
    hasNextPage: hasMoreCourses,
  } = useMyCourses(8);
  const { items: notifications, isLoading: notificationsLoading } =
    useNotifications();
  const { data: sr, isLoading: srLoading } = useSrDashboardSummary();
  const programs = useMyLearningPrograms();

  const displayName = getAuthDisplayName(user);
  const initials = getAuthUserInitials(user);

  const visibleCourses = myCourses.slice(0, 8);
  const enrolledCount = myCourses.length;
  const unreadCount = notifications.filter((n) => n.read_at === null).length;
  const programEnrollments = programs.data ?? [];
  const hasLearningPrograms = programEnrollments.some(
    (enrollment) =>
      enrollment.status === "active" ||
      enrollment.status === "completed" ||
      enrollment.status === "awaiting_path",
  );
  const awaitingPath = programEnrollments.some(
    (e) => e.status === "awaiting_path",
  );

  function scrollCarousel(direction: "left" | "right") {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  }

  return (
    <StudentPage>
      <StudentPageHeader
        eyebrow={
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AuthenticatedAvatarImage alt={displayName} />
              <AvatarFallback className="bg-m3-primary text-white text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <AIInsightChip pulse={false} className="ai-pulse">
              {t("dashboard.active_session")}
            </AIInsightChip>
          </div>
        }
        title={t("dashboard.welcome", { name: displayName })}
        subtitle={
          <>
            {/* Three states. A student awaiting a path and a student with no
                  programme at all both have zero courses, but only one of them
                  has something they can do about it. */}
            {programs.isLoading
              ? t("dashboard.learning_plan_loading_intro")
              : programs.isError
                ? t("dashboard.learning_plan_unavailable_intro")
                : awaitingPath
                  ? t("dashboard.awaiting_path_intro")
                  : hasMoreCourses
                    ? t("dashboard.enrolled_count_more", {
                        count: enrolledCount,
                      })
                    : enrolledCount > 0
                      ? t("dashboard.enrolled_count", {
                          count: enrolledCount,
                        })
                      : t("dashboard.no_enrollments_intro")}
          </>
        }
      />

      <ChoosePathPrompt enrollments={programEnrollments} />

      <LearningPlanSection
        enrollments={programEnrollments}
        isLoading={programs.isLoading}
        isError={programs.isError}
        onRetry={() => void programs.refetch()}
      />

      <DashboardStatsSection
        stats={{
          coursesLoading,
          enrolledCount: hasMoreCourses ? `${enrolledCount}+` : enrolledCount,
          notificationsLoading,
          unreadCount,
          srLoading,
          sr,
        }}
      />

      <MyCoursesSection
        courses={{
          carouselRef,
          coursesLoading,
          enrolledCount,
          hasMoreCourses,
          hasLearningPrograms,
          visibleCourses,
          scrollCarousel,
        }}
      />

      <NotificationsSection
        inbox={{ notifications, notificationsLoading, unreadCount }}
      />

      <ReadyCtaSection hasLearningPrograms={hasLearningPrograms} />
    </StudentPage>
  );
}
