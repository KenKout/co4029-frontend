import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, Inbox, Sparkles, Target } from "lucide-react";
import { useMyCourses } from "@/lib/api/hooks/courses";
import {
  useCardsDue,
  useCoursesSrOverviews,
} from "@/lib/api/hooks/spaced-repetition";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CourseSrCard } from "@/routes/me/study/_components/sr-dashboard/CourseSrCard";

/**
 * The student SR home: enrolment / maturity / due tiles plus one expandable
 * card per course. The card and its lesson rows live in
 * `_components/sr-dashboard/`.
 */
export default function SrDashboardPage() {
  const { t } = useTranslation();
  const { items: courses, isLoading: coursesLoading } = useMyCourses(20);
  const cardsDue = useCardsDue({ limit: 50 });
  const overviews = useCoursesSrOverviews(courses.map((c) => c.id));

  const dueCount = cardsDue.items?.length ?? 0;
  const dueLabel = cardsDue.hasNextPage ? `${dueCount}+` : String(dueCount);

  const overviewsLoading = overviews.some((q) => q.isLoading);
  const matureLessons = overviews.reduce(
    (acc, q) =>
      acc + (q.data?.filter((l) => l.status === "mature").length ?? 0),
    0,
  );

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-m3-primary text-xs font-bold uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t("sr_dashboard.chip")}</span>
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-m3-primary leading-tight">
            {t("sr_dashboard.title")}
          </h1>
          <p className="text-m3-on-surface-variant text-sm max-w-2xl">
            {t("sr_dashboard.intro")}
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label={t("sr_dashboard.stats.enrolled")}
            value={coursesLoading ? "—" : courses.length}
            sublabel={t("sr_dashboard.stats.enrolled_sub")}
            icon={BookOpen}
            variant="primary"
          />
          <StatCard
            label={t("sr_dashboard.stats.lessons_ready")}
            value={coursesLoading || overviewsLoading ? "—" : matureLessons}
            sublabel={t("sr_dashboard.stats.lessons_ready_sub")}
            icon={Target}
            variant="surface"
          />
          <StatCard
            label={t("sr_dashboard.stats.cards_due")}
            value={cardsDue.isLoading ? "—" : dueLabel}
            sublabel={t("sr_dashboard.stats.cards_due_sub")}
            icon={Inbox}
            variant="surface"
          />
        </section>

        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <SectionHeader
              title={t("sr_dashboard.section_title")}
              subtitle={t("sr_dashboard.section_subtitle")}
            />
            <Link
              to="/me/study/cards-due"
              search={{ lesson: undefined, course: undefined }}
              className="inline-flex items-center gap-2 gradient-primary text-white rounded-xl font-semibold px-4 py-2 text-sm shadow-glass hover:opacity-90 transition-opacity self-start sm:self-auto cursor-pointer"
            >
              {t("sr_dashboard.review_now")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {coursesLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={t("sr_dashboard.no_courses_title")}
              description={t("sr_dashboard.no_courses_body")}
              cta={
                <Link to="/courses">
                  <Button
                    variant="default"
                    className="gap-2 font-semibold cursor-pointer"
                  >
                    {t("sr_dashboard.discover_courses")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <CourseSrCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
