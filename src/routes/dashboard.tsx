import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/auth/AuthProvider";
import { useMyCourses } from "@/lib/api/hooks/courses";
import { useNotifications } from "@/lib/api/hooks/notifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { useSrDashboardSummary } from "@/lib/api/hooks/spaced-repetition";
import { getAuthDisplayName, getAuthUserInitials } from "@/lib/auth";
import AskAiFab from "./_components/dashboard/AskAiFab";
import DashboardStatsSection from "./_components/dashboard/DashboardStatsSection";
import MyCoursesSection from "./_components/dashboard/MyCoursesSection";
import NotificationsSection from "./_components/dashboard/NotificationsSection";
import ReadyCtaSection from "./_components/dashboard/ReadyCtaSection";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [fabHovered, setFabHovered] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const { items: myCourses, isLoading: coursesLoading } = useMyCourses(8);
  const { items: notifications, isLoading: notificationsLoading } =
    useNotifications();
  const { data: sr, isLoading: srLoading } = useSrDashboardSummary();

  const firstName = getAuthDisplayName(user).split(" ")[0];
  const initials = getAuthUserInitials(user);

  const visibleCourses = myCourses.slice(0, 8);
  const enrolledCount = myCourses.length;
  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  function scrollCarousel(direction: "left" | "right") {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative min-h-screen pb-28">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 mb-1">
              <Avatar className="h-10 w-10">
                {user?.profile?.avatar_url && (
                  <AvatarImage src={user.profile.avatar_url} alt="" />
                )}
                <AvatarFallback className="bg-m3-primary text-white text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <AIInsightChip pulse={false} className="ai-pulse">
                {t("dashboard.active_session")}
              </AIInsightChip>
            </div>
            <h1 className="font-headline font-bold text-4xl text-m3-primary leading-tight">
              {t("dashboard.welcome", { name: firstName })}
            </h1>
            <p className="text-m3-on-surface-variant text-base">
              {enrolledCount > 0
                ? t("dashboard.enrolled_count", { count: enrolledCount })
                : t("dashboard.explore_intro")}
            </p>
          </div>
        </header>

        <DashboardStatsSection
          stats={{
            coursesLoading,
            enrolledCount,
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
            visibleCourses,
            scrollCarousel,
          }}
        />

        <NotificationsSection
          inbox={{ notifications, notificationsLoading, unreadCount }}
        />

        <ReadyCtaSection />
      </div>

      <AskAiFab fabHovered={fabHovered} setFabHovered={setFabHovered} />
    </div>
  );
}
