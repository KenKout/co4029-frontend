import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ApiError } from "@/lib/api/client";
import { useCourseBySlug, useCourseContent } from "@/lib/api/hooks/courses";
import { useMyCourseProgress } from "@/lib/api/hooks/progress";
import { useStreamUrl } from "@/lib/api/hooks/materials";
import type { LessonPublic, ModulePublic } from "@/lib/api/types";
import { useLessonEngagementTracker } from "@/lib/hooks/useLessonEngagementTracker";
import { LessonKnowledgeMap } from "@/routes/courses/_components/LessonKnowledgeMap";
import { Link, useParams } from "@tanstack/react-router";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@vidstack/react/player/styles/default/theme.css";
import { ArrowRight, Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CourseHomeProps } from "./_components/course-learn/CourseHome";
import { CourseHome } from "./_components/course-learn/CourseHome";
import { CurriculumSidebar } from "./_components/course-learn/CurriculumSidebar";
import {
  activeTitleFor,
  deriveShowHome,
  earliestPendingItemId,
  itemStateFor,
} from "./_components/course-learn/helpers";
import { resolveCourseInstructors } from "./_components/course-learn/InstructorBlock";
import { LearnBreadcrumb } from "./_components/course-learn/LearnBreadcrumb";
import { LessonHeadingBlock } from "./_components/course-learn/LessonHeadingBlock";
import {
  LessonPlayerFrame,
  LessonVideoPlayer,
} from "./_components/course-learn/LessonPlayerFrame";
import { LessonTabsSection } from "./_components/course-learn/LessonTabsSection";
import { NoLessonsNotice } from "./_components/course-learn/NoLessonsNotice";
import { ReadingLessonBody } from "./_components/course-learn/ReadingLessonBody";
import type {
  CurriculumProps,
  FlatItem,
  Tab,
} from "./_components/course-learn/types";
import {
  useCurriculumItems,
  useInProgressInterviewSessions,
  useModuleItemsMap,
  useMyInterviewProgress,
  useMyQuizProgress,
} from "./_components/course-learn/use-curriculum";
import type { LearnUrlState } from "./_components/course-learn/use-learn-url-state";
import {
  useApplyDeepLink,
  useLearnUrlState,
} from "./_components/course-learn/use-learn-url-state";
import {
  useActiveLessonContent,
  useLessonStatusMap,
} from "./_components/course-learn/use-lesson-content";
import { useTabDeepLink } from "./_components/course-learn/use-tab-deep-link";

export default function CourseLearnPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };

  const courseQuery = useCourseBySlug(slug);
  const course = courseQuery.data;
  const courseId = course?.id;
  const {
    data: content,
    isLoading: contentLoading,
    isError: contentError,
    error: contentErrorObj,
  } = useCourseContent(courseId);

  const sortedModules = useMemo<ModulePublic[]>(() => {
    if (!content) return [];
    return [...content.modules].sort((a, b) => a.position - b.position);
  }, [content]);

  const courseUnavailable =
    courseQuery.isError &&
    courseQuery.error instanceof ApiError &&
    courseQuery.error.status === 404;

  // BR: an unenrolled student cannot reach the learn page — the content
  // tree 403s with not_enrolled; render an explicit panel instead of an
  // empty curriculum.
  const notEnrolled =
    contentError &&
    contentErrorObj instanceof ApiError &&
    contentErrorObj.status === 403 &&
    (contentErrorObj.parsedBody as { detail?: { error?: string } } | null)
      ?.detail?.error === "not_enrolled";

  return (
    <CourseLearnView
      slug={slug}
      courseLoading={courseQuery.isLoading}
      courseUnavailable={courseUnavailable}
      notEnrolled={notEnrolled}
      course={course}
      contentLoading={contentLoading}
      sortedModules={sortedModules}
    />
  );
}

function CourseLearnView({
  slug,
  courseLoading,
  courseUnavailable,
  notEnrolled,
  course,
  contentLoading,
  sortedModules,
}: {
  slug: string;
  courseLoading: boolean;
  courseUnavailable: boolean;
  notEnrolled: boolean;
  course: ReturnType<typeof useCourseBySlug>["data"];
  contentLoading: boolean;
  sortedModules: ModulePublic[];
}) {
  const { t } = useTranslation();

  if (courseLoading || contentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-3 w-64">
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse" />
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  if (notEnrolled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <Lock className="h-10 w-10 mx-auto text-m3-outline" />
          <p className="text-m3-on-surface font-headline font-bold text-xl">
            {t("course_detail.enroll_required")}
          </p>
          <p className="text-sm text-m3-on-surface-variant">
            {t("course_detail.enroll_required_body")}
          </p>
          <Link to="/courses/$slug" params={{ slug }}>
            <Button className="gradient-primary text-white rounded-xl gap-2">
              {t("course_detail.back_to_course")}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (courseUnavailable || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-m3-on-surface font-headline font-bold text-xl">
            {t("course_detail.unavailable_title")}
          </p>
          <p className="text-sm text-m3-on-surface-variant">
            {t("course_detail.unavailable_body")}
          </p>
          <Link to="/courses">
            <Button className="gradient-primary text-white rounded-xl gap-2">
              {t("course_detail.browse_courses")}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CourseLearnLoaded
      slug={slug}
      course={course}
      sortedModules={sortedModules}
    />
  );
}

function CourseLearnLoaded({
  slug,
  course,
  sortedModules,
}: {
  slug: string;
  course: NonNullable<ReturnType<typeof useCourseBySlug>["data"]>;
  sortedModules: ModulePublic[];
}) {
  const { t } = useTranslation();
  const itemsByModule = useModuleItemsMap(sortedModules);
  const instructors = resolveCourseInstructors(course);
  const { flatItems, lessonItems } = useCurriculumItems(
    sortedModules,
    itemsByModule,
    t,
  );
  const inProgressByConfigId = useInProgressInterviewSessions(course.id);
  const quizProgressMap = useMyQuizProgress(course.id);
  const interviewProgressMap = useMyInterviewProgress(course.id);

  const [activeIdx, setActiveIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("Lesson Notes");

  const activeEntry = lessonItems[activeIdx] ?? null;
  const { activeLessonId, activeLesson, lessonUnavailable, resources } =
    useActiveLessonContent(activeEntry, activeTab);
  const lessonStatusMap = useLessonStatusMap(course.id);
  const courseProgress = useMyCourseProgress(course.id);

  const urlState = useLearnUrlState(lessonItems, lessonStatusMap);
  const {
    search,
    navigate,
    playerRef,
    seekSeconds,
    targetPage,
    targetAnchor,
    resumeIdx,
    completedCount: completedLessonCount,
  } = urlState;

  useTabDeepLink(search.tab, setActiveTab);

  const showHome = deriveShowHome(urlState);

  const { openLesson, goHome, goPrev, goNext, hasPrev, hasNext } =
    useLearnNavigation({
      slug,
      lessonItems,
      activeIdx,
      setActiveIdx,
      search,
      navigate,
    });

  useApplyDeepLink({
    playerRef,
    activeLessonId,
    seekSeconds,
    targetPage,
    targetAnchor,
  });

  const activeTitle = activeTitleFor(activeLesson, activeEntry);
  const itemState = (fi: FlatItem) =>
    itemStateFor(
      fi,
      activeLessonId,
      lessonStatusMap,
      quizProgressMap,
      interviewProgressMap,
    );
  // Earliest item still to do — highlighted in the curriculum so the eye
  // lands on the next step. Aligns with the home resume CTA.
  const nextItemId = useMemo(
    () => earliestPendingItemId(flatItems, itemState),
    [flatItems, itemState],
  );

  const curriculum: CurriculumProps = {
    sortedModules,
    flatItems,
    lessonItems,
    itemState,
    onSelect: openLesson,
    slug,
    activeModuleId: activeEntry?.moduleId,
    inProgressByConfigId,
    interviewProgressMap,
    nextItemId,
  };

  if (!lessonItems.length) {
    return <NoLessonsNotice slug={slug} />;
  }

  return (
    <div className="min-h-screen pb-16 sm:pb-24">
      <div className="mx-auto max-w-[1800px] px-3 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <LearnBreadcrumb
          slug={slug}
          courseTitle={course.title}
          showHome={showHome}
          onGoHome={goHome}
          activeTitle={activeTitle}
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-6">
            {!showHome && activeEntry && (
              <LessonHeadingBlock
                title={activeTitle}
                moduleTitle={activeEntry.moduleTitle}
                activeLessonId={activeLessonId}
                courseId={course.id}
                lessonStatusMap={lessonStatusMap}
              />
            )}

            <LessonMainPane
              showHome={showHome}
              lessonUnavailable={lessonUnavailable}
              activeLesson={activeLesson}
              courseId={course.id}
              playerRef={playerRef}
              homeProps={{
                ...curriculum,
                course,
                completedUnits:
                  courseProgress.data?.unit_done ?? completedLessonCount,
                totalUnits:
                  courseProgress.data?.unit_total ?? lessonItems.length,
                resumeIdx,
                resumeLabel: lessonItems[resumeIdx]?.label,
                resumeStarted: completedLessonCount > 0,
              }}
            />

            {!showHome && (
              <LessonTabsSection
                activeTab={activeTab}
                onTabChange={setActiveTab}
                activeLessonId={activeLessonId}
                resources={resources}
                hasPrev={hasPrev}
                hasNext={hasNext}
                onPrev={goPrev}
                onNext={goNext}
                prevLabel={lessonItems[activeIdx - 1]?.label}
                nextLabel={lessonItems[activeIdx + 1]?.label}
              />
            )}
          </div>

          {!showHome && (
            <CurriculumSidebar {...curriculum} instructors={instructors} />
          )}
        </div>
      </div>
    </div>
  );
}

function useLearnNavigation({
  slug,
  lessonItems,
  activeIdx,
  setActiveIdx,
  search,
  navigate,
}: {
  slug: string;
  lessonItems: FlatItem[];
  activeIdx: number;
  setActiveIdx: (idx: number) => void;
  search: LearnUrlState["search"];
  navigate: LearnUrlState["navigate"];
}) {
  function openLesson(idx: number) {
    setActiveIdx(idx);
    const opened = lessonItems[idx]?.item.target;
    const openedRef = opened?.slug || opened?.id || String(idx);
    void navigate({
      to: "/courses/$slug/learn",
      params: { slug },
      search: (prev) => ({ ...prev, item: openedRef }),
    });
  }

  function goHome() {
    void navigate({
      to: "/courses/$slug/learn",
      params: { slug },
      search: (prev) => ({ ...prev, item: undefined }),
    });
  }

  useEffect(() => {
    if (!search.item || lessonItems.length === 0) return;
    let idx = lessonItems.findIndex(
      (li) => li.item.target?.slug === search.item,
    );
    if (idx < 0) {
      idx = lessonItems.findIndex((li) => li.item.target?.id === search.item);
    }
    if (idx < 0) {
      const asNum = Number(search.item);
      if (Number.isInteger(asNum) && asNum >= 0 && asNum < lessonItems.length) {
        idx = asNum;
      }
    }
    if (idx >= 0) setActiveIdx(idx);
  }, [search.item, lessonItems]);

  const hasPrev = activeIdx > 0;
  const hasNext = activeIdx < lessonItems.length - 1;

  function goPrev() {
    if (hasPrev) setActiveIdx(activeIdx - 1);
  }
  function goNext() {
    if (hasNext) setActiveIdx(activeIdx + 1);
  }

  return { openLesson, goHome, goPrev, goNext, hasPrev, hasNext };
}

/**
 * The main column's content slot: course-home summary, the unavailable notice,
 * the reading pane, or the video player.
 */
function LessonMainPane({
  showHome,
  homeProps,
  lessonUnavailable,
  activeLesson,
  courseId,
  playerRef,
}: {
  showHome: boolean;
  homeProps: CourseHomeProps;
  lessonUnavailable: boolean;
  activeLesson: LessonPublic | null;
  courseId: string;
  playerRef: LearnUrlState["playerRef"];
}) {
  const { t } = useTranslation();

  return showHome ? (
    <CourseHome {...homeProps} />
  ) : lessonUnavailable ? (
    <GlassCard className="p-10 text-center">
      <p className="font-headline font-bold text-xl text-m3-on-surface mb-2">
        {t("course_learn.lesson_unavailable_title")}
      </p>
      <p className="text-sm text-m3-on-surface-variant">
        {t("course_learn.lesson_unavailable_body")}
      </p>
    </GlassCard>
  ) : activeLesson?.lesson_type === "reading" ? (
    <ReadingLessonPane lesson={activeLesson} courseId={courseId} />
  ) : activeLesson ? (
    <LessonVideoPlayer
      lesson={activeLesson}
      courseId={courseId}
      containerRef={playerRef}
    />
  ) : (
    <LessonPlayerFrame containerRef={playerRef} />
  );
}

function ReadingLessonPane({
  lesson,
  courseId,
}: {
  lesson: LessonPublic;
  courseId: string;
}) {
  const { t } = useTranslation();
  const materialId = lesson.primary_material_id ?? null;
  const streamQuery = useStreamUrl(materialId);
  const streamUrl = streamQuery.data?.url ?? null;
  const materialVersionId = streamQuery.data?.material_version_id ?? null;
  const readingContentRef = useRef<HTMLDivElement>(null);

  useLessonEngagementTracker({
    materialVersionId,
    lessonId: lesson.id,
    courseId,
    contentRef: readingContentRef,
  });

  return (
    <div className="space-y-6">
      <div ref={readingContentRef}>
        <GlassCard
          className="space-y-6 p-4 sm:p-6"
          data-testid="course-learn-reading"
        >
          <ReadingLessonBody
            lesson={lesson}
            materialId={materialId}
            streamUrl={streamUrl}
            isLoading={streamQuery.isLoading}
            t={t}
          />
        </GlassCard>
      </div>
      <LessonKnowledgeMap lessonId={lesson.id} />
    </div>
  );
}
