import { useParams } from "@tanstack/react-router";
import { ApiError } from "@/lib/api/client";
import {
  useCourseBySlug,
  useCourseContent,
  useCourseOutcomes,
} from "@/lib/api/hooks/courses";
import { useMyCourseProgress } from "@/lib/api/hooks/progress";
import { useMyEnrollment } from "@/lib/api/hooks/me";
import {
  CourseContentSection,
  CourseOutcomesSection,
} from "@/routes/_components/course-detail/CourseContentSections";
import {
  CourseDetailSkeleton,
  CourseUnavailablePanel,
} from "@/routes/_components/course-detail/CourseDetailAtoms";
import { CourseBreadcrumb } from "@/routes/_components/course-detail/CourseBreadcrumb";
import { CourseCard } from "@/routes/_components/course-detail/CourseCard";
import { InstructorCard } from "@/routes/_components/course-detail/InstructorCard";
import { slugGradient } from "@/routes/_components/course-detail/helpers";

/**
 * Public course landing page:
 *
 * - Full-width breadcrumb (kept as-is).
 * - Full-width CourseCard split 50/50: left = AI badge, title, summary
 *   (show more/less), hours/difficulty/modules meta, Start/Continue button
 *   and overall progress; right = course image with an ease blend at its
 *   left edge.
 * - Below, a 60/40 split: "What you'll learn" + the course-content
 *   curriculum on the left (60%), the "About the instructor" card with the
 *   four contact infos on the right (40%). The curriculum is
 *   enrollment-gated (BR): an unenrolled student sees the landing page as
 *   pure advertisement — no item list, no Start button.
 *
 * The sections live in `_components/course-detail/`; this file owns the
 * queries and the loading / unavailable branches.
 */
export default function CourseDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };

  const courseQuery = useCourseBySlug(slug);
  const course = courseQuery.data;
  const courseId = course?.id;

  // Enrollment state drives the whole gated surface: content tree fetch,
  // curriculum section, CTA button. 404 (no enrollment row) → not enrolled.
  const { data: enrollment, isLoading: enrollmentLoading } =
    useMyEnrollment(courseId);
  const enrolled = Boolean(enrollment);

  const { data: outcomes, isLoading: outcomesLoading } =
    useCourseOutcomes(courseId);
  // BR: only enrolled students may fetch the course items tree.
  const { data: content, isLoading: contentLoading } = useCourseContent(
    enrolled ? courseId : undefined,
  );
  // Enrolled-student progress (404 for anonymous/unenrolled → undefined):
  // drives "Continue" + the progress bar on the CourseCard and the
  // per-module ✓ marks in the curriculum.
  const { data: progress, isLoading: progressLoading } =
    useMyCourseProgress(courseId);

  const courseUnavailable =
    courseQuery.isError &&
    courseQuery.error instanceof ApiError &&
    courseQuery.error.status === 404;

  if (courseQuery.isLoading) {
    return <CourseDetailSkeleton />;
  }

  if (courseUnavailable || !course) {
    return <CourseUnavailablePanel />;
  }

  const gradientClass = slugGradient(slug);
  const moduleCount = content?.modules.length ?? 0;

  return (
    <div className="min-h-screen pb-28">

      {/* Fluid width — no hard max-width (product feedback 2026-08-04):
          the layout breathes with the viewport like the quiz review page. */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-2">
        <CourseBreadcrumb course={course} />

        <CourseCard
          course={course}
          gradientClass={gradientClass}
          moduleCount={moduleCount}
          progress={progress}
          progressLoading={progressLoading}
          enrolled={enrolled}
          enrollmentLoading={enrollmentLoading}
        />

        {/* 60% / 40% split: What you'll learn + curriculum | About. */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start mt-8">
          <div className="lg:col-span-3 min-w-0 space-y-8">
            <CourseOutcomesSection
              outcomes={outcomes}
              isLoading={outcomesLoading}
            />

            {/* BR: the item tree is only displayable to enrolled students. */}
            {enrolled && (
              <CourseContentSection
                content={content}
                moduleCount={moduleCount}
                isLoading={contentLoading}
                progress={progress}
              />
            )}
          </div>

          {/* About the instructor — stays put next to the curriculum on
              wide screens, stacks below on mobile. */}
          <div className="lg:col-span-2 lg:sticky lg:top-24 lg:self-start w-full">
            <InstructorCard course={course} />
          </div>
        </div>
      </div>
    </div>
  );
}
