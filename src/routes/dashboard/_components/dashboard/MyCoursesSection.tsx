import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard } from "@/routes/courses/_components/courses-list/CourseCard";
import EmptyCourses from "./EmptyCourses";
import type { CoursesSectionController } from "./types";

export default function MyCoursesSection({
  courses,
}: {
  courses: CoursesSectionController;
}) {
  const { t } = useTranslation();
  const {
    carouselRef,
    coursesLoading,
    enrolledCount,
    visibleCourses,
    scrollCarousel,
  } = courses;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader
          title={t("dashboard.your_courses")}
          subtitle={t("dashboard.your_courses_sub")}
        />
        <div className="flex items-center gap-2 shrink-0">
          {enrolledCount > 8 && (
            <Link
              to="/courses"
              search={{ scope: "enrolled" }}
              className="text-xs font-semibold text-m3-secondary hover:underline"
            >
              {t("dashboard.view_all")}
            </Link>
          )}
          {enrolledCount > 3 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollCarousel("left")}
                className="rounded-xl border-m3-outline-variant hover:bg-m3-surface-container-low"
                aria-label={t("dashboard.scroll_left")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollCarousel("right")}
                className="rounded-xl border-m3-outline-variant hover:bg-m3-surface-container-low"
                aria-label={t("dashboard.scroll_right")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {coursesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : enrolledCount === 0 ? (
        <div className="grid grid-cols-1">
          <EmptyCourses />
        </div>
      ) : enrolledCount <= 3 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              status="active"
            />
          ))}
        </div>
      ) : (
        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory no-scrollbar"
        >
          {visibleCourses.map((course) => (
            <div key={course.id} className="flex-none w-80 snap-start">
              <CourseCard
                course={course}
                status="active"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
