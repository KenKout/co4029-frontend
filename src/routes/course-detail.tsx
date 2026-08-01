import { useParams } from "@tanstack/react-router";
import { ApiError } from "@/lib/api/client";
import {
  useCourseBySlug,
  useCourseContent,
  useCourseOutcomes,
  useCourseTags,
} from "@/lib/api/hooks/courses";
import {
  AiMockInterviewCard,
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
 * Public course landing page. The hero, curriculum, instructor card and CTA
 * card live in `_components/course-detail/`; this file owns the queries and the
 * loading / unavailable branches.
 */
export default function CourseDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };

  const courseQuery = useCourseBySlug(slug);
  const course = courseQuery.data;
  const courseId = course?.id;

  const { data: outcomes, isLoading: outcomesLoading } =
    useCourseOutcomes(courseId);
  const { data: content, isLoading: contentLoading } =
    useCourseContent(courseId);
  const { data: tags } = useCourseTags(courseId);

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

  const ctaCard = (
    <CtaCard
      course={course}
      gradientClass={gradientClass}
      moduleCount={moduleCount}
      tags={tags}
    />
  );

  return (
    <div className="min-h-screen pb-28">
      <CourseDetailHero
        course={course}
        moduleCount={moduleCount}
        tags={tags}
        ctaCard={ctaCard}
      />

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 min-w-0 space-y-8">
            <CourseOutcomesSection
              outcomes={outcomes}
              isLoading={outcomesLoading}
            />

            <CourseContentSection
              content={content}
              moduleCount={moduleCount}
              isLoading={contentLoading}
            />

            {/* Bio + contact details in one section (self-hides when the
                course has neither). */}
            <InstructorCard course={course} />

            <AiMockInterviewCard />
          </div>

          <div className="w-full lg:hidden">{ctaCard}</div>
        </div>
      </div>
    </div>
  );
}
