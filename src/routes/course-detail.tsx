import { useParams } from "@tanstack/react-router";
import { ApiError } from "@/lib/api/client";
import {
  useCourseBySlug,
  useCourseContent,
  useCourseOutcomes,
  useCourseTags,
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
import { CourseDetailHero } from "@/routes/_components/course-detail/CourseDetailHero";
import { CtaCard } from "@/routes/_components/course-detail/CtaCard";
import { InstructorCard } from "@/routes/_components/course-detail/InstructorCard";
import { slugGradient } from "@/routes/_components/course-detail/helpers";

/**
 * Public course landing page, two-column layout:
 *
 * - Left (8/12): hero (breadcrumb, title, description, one-line meta, AI
 *   teaser, tags), "What you'll learn", instructor card. The course-content
 *   curriculum is enrollment-gated (BR): an unenrolled student sees the
 *   landing page as pure advertisement — no item list, no Start button.
 * - Right (4/12): sticky CTA rail — cover, Continue/Start button for
 *   enrolled students, a locked "enrollment required" state otherwise;
 *   progress bar for enrolled students, duration/level meta, instructor row.
 *
 * The hero, curriculum, instructor card and CTA card live in
 * `_components/course-detail/`; this file owns the queries and the loading /
 * unavailable branches.
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
  const { data: tags } = useCourseTags(courseId);
  // Enrolled-student progress (404 for anonymous/unenrolled → undefined):
  // drives "Continue" + the progress bar on the CTA rail and the per-module
  // ✓ marks in the curriculum.
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 min-w-0 space-y-8 order-2 lg:order-1">
            <CourseDetailHero course={course} tags={tags} />

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

            {/* Bio + contact details in one section (self-hides when the
                course has neither). */}
            <InstructorCard course={course} />
          </div>

          {/* Sticky CTA rail — stays put next to the content on wide
              screens, stacks below everything on mobile. */}
          {/* On mobile the CTA (Continue learning) renders FIRST so the
              most important action is at the top; on lg it goes back to
              the sticky right rail. */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start w-full order-1 lg:order-2">
            <CtaCard
              course={course}
              gradientClass={gradientClass}
              moduleCount={moduleCount}
              progress={progress}
              progressLoading={progressLoading}
              enrolled={enrolled}
              enrollmentLoading={enrollmentLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
