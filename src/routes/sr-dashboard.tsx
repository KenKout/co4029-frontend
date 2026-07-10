import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Inbox,
  Lock,
  Sparkles,
  Target,
} from "lucide-react";
import { useMyCourses } from "@/lib/api/hooks/courses";
import {
  useCardsDue,
  useCourseSrOverview,
  useCoursesSrOverviews,
} from "@/lib/api/hooks/spaced-repetition";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Course, LessonOverviewItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  LessonOverviewItem["status"],
  { i18nKey: string; badge: string; dot: string; icon: typeof CheckCircle2 }
> = {
  mature: {
    i18nKey: "sr_dashboard.status.mature",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  learning: {
    i18nKey: "sr_dashboard.status.learning",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
    icon: Brain,
  },
  locked: {
    i18nKey: "sr_dashboard.status.locked",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
    icon: Lock,
  },
};

function CourseSrCard({ course }: { course: Course }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { data: overview, isLoading } = useCourseSrOverview(
    expanded ? course.id : undefined,
  );

  const totalDue = overview?.reduce((acc, l) => acc + l.due_count, 0) ?? 0;
  const matureCount =
    overview?.filter((l) => l.status === "mature").length ?? 0;

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-m3-surface-container-low transition-colors cursor-pointer"
        aria-expanded={expanded}
      >
        <div className="w-11 h-11 rounded-xl bg-m3-primary-fixed flex items-center justify-center shrink-0">
          <BookOpen className="h-5 w-5 text-m3-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-m3-on-surface text-base leading-snug truncate">
            {course.title}
          </h3>
          {expanded && overview ? (
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              {t("sr_dashboard.card_summary", {
                lessons: overview.length,
                mature: matureCount,
                due: totalDue,
              })}
            </p>
          ) : (
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              {t("sr_dashboard.card_intro")}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-m3-outline-variant/20 px-5 py-4 space-y-2">
          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          )}
          {!isLoading && overview && overview.length === 0 && (
            <p className="text-sm text-m3-on-surface-variant py-3 text-center">
              {t("sr_dashboard.no_lessons")}
            </p>
          )}
          {!isLoading &&
            overview?.map((lesson) => {
              const meta = STATUS_META[lesson.status];
              const StatusIcon = meta.icon;
              return (
                <div
                  key={lesson.lesson_id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-m3-surface-container-low transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      lesson.status === "mature"
                        ? "bg-emerald-100"
                        : lesson.status === "learning"
                          ? "bg-amber-100"
                          : "bg-slate-100",
                    )}
                  >
                    <StatusIcon
                      className={cn(
                        "h-4 w-4",
                        lesson.status === "mature"
                          ? "text-emerald-600"
                          : lesson.status === "learning"
                            ? "text-amber-600"
                            : "text-slate-500",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-m3-on-surface truncate">
                      {lesson.lesson_title}
                    </p>
                    <p className="text-xs text-m3-on-surface-variant">
                      {t("sr_dashboard.kr_due", {
                        kr: Math.round(lesson.kr_estimate * 100),
                        due: lesson.due_count,
                      })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0",
                      meta.badge,
                    )}
                  >
                    {t(meta.i18nKey)}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default function SrDashboardPage() {
  const { t } = useTranslation();
  const { items: courses, isLoading: coursesLoading } = useMyCourses(20);
  const cardsDue = useCardsDue({ limit: 50 });
  const overviews = useCoursesSrOverviews(courses.map((c) => c.id));

  const dueCount = cardsDue.items?.length ?? 0;
  const dueLabel = cardsDue.hasNextPage ? `${dueCount}+` : String(dueCount);

  const overviewsLoading = overviews.some((q) => q.isLoading);
  const matureLessons = overviews.reduce(
    (acc, q) => acc + (q.data?.filter((l) => l.status === "mature").length ?? 0),
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
              to="/study/cards-due"
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
                  <Button variant="default" className="gap-2 font-semibold cursor-pointer">
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
