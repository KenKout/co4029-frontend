import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import type { TeacherDashboardStats } from "@/lib/api/hooks/teacher-courses";
import type { Course } from "@/lib/api/types/common";
import { TeacherCourseCard } from "@/routes/teacher/_components/TeacherCourseCard";

import type { TranslateFn } from "./types";

function CourseCardSkeletons() {
  return (
    <div className="grid gap-5 mt-4 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-xl ghost-border overflow-hidden">
          <div className="aspect-video bg-m3-surface-container animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 bg-m3-surface-container animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-m3-surface-container animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NoCoursesYet({ t }: { t: TranslateFn }) {
  return (
    <div className="mt-8 text-center text-m3-on-surface-variant">
      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
      <p className="text-sm font-medium">
        {t("teacher_dashboard.your_courses.no_courses_yet")}
      </p>
      <p className="text-xs mt-1">
        {t("teacher_dashboard.your_courses.create_first")}
      </p>
    </div>
  );
}

/** "Your courses" section: skeleton, empty state, or the first six cards. */
export function CourseListSection({
  courses,
  isLoading,
  stats,
  t,
}: {
  courses: Course[];
  isLoading: boolean;
  stats: TeacherDashboardStats | undefined;
  t: TranslateFn;
}) {
  return (
    <div>
      <SectionHeader
        title={t("teacher_dashboard.your_courses.title")}
        subtitle={t("teacher_dashboard.your_courses.subtitle")}
        action={
          <Link to="/teacher/courses">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              {t("teacher_dashboard.your_courses.view_all")}{" "}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <CourseCardSkeletons />
      ) : courses.length === 0 ? (
        <NoCoursesYet t={t} />
      ) : (
        <div className="grid gap-5 mt-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.slice(0, 6).map((course, i) => (
            <TeacherCourseCard
              key={course.id}
              course={course}
              index={i}
              pendingReviewCount={stats?.pending_review_by_course?.[course.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
