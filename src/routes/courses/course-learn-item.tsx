import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { InterviewRoomProvider } from "@/components/interview/interview-room-provider";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ApiError } from "@/lib/api/client";
import { useCourseBySlug, useCourseContent } from "@/lib/api/hooks/courses";
import { useStreamUrl } from "@/lib/api/hooks/materials";
import type { CoursePublic, LessonPublic, ModulePublic } from "@/lib/api/types";
import { useLessonEngagementTracker } from "@/lib/hooks/useLessonEngagementTracker";
import { useQuizAttemptSession } from "@/lib/quiz/use-quiz-attempt-session";
import { interviewRoomProps } from "@/routes/courses/_components/course-interview/agent-voice-presentation";
import { InterviewCameraGateScreen } from "@/routes/courses/_components/course-interview/InterviewCameraGateScreen";
import { cameraGateBlocks } from "@/routes/courses/_components/course-interview/use-interview-camera-gate";
import { InterviewFullscreenGateScreen } from "@/routes/courses/_components/course-interview/InterviewFullscreenGateScreen";
import { InterviewLobbyScreen } from "@/routes/courses/_components/course-interview/InterviewLobbyScreen";
import { InterviewResultsScreen } from "@/routes/courses/_components/course-interview/InterviewResultsScreen";
import {
  InterviewLoadingScreen,
  InterviewMissingConfigScreen,
} from "@/routes/courses/_components/course-interview/InterviewStatusScreens";
import { InterviewWorkspaceScreen } from "@/routes/courses/_components/course-interview/InterviewWorkspaceScreen";
import { useCourseInterviewWithRef } from "@/routes/courses/_components/course-interview/use-course-interview-with-ref";
import { CurriculumSidebar } from "@/routes/courses/_components/course-learn/CurriculumSidebar";
import { resolveCourseInstructors } from "@/routes/courses/_components/course-learn/InstructorBlock";
import {
  earliestPendingItemId,
  itemStateFor,
} from "@/routes/courses/_components/course-learn/helpers";
import { LessonHeadingBlock } from "@/routes/courses/_components/course-learn/LessonHeadingBlock";
import { LessonVideoPlayer } from "@/routes/courses/_components/course-learn/LessonPlayerFrame";
import { LessonTabsSection } from "@/routes/courses/_components/course-learn/LessonTabsSection";
import { ReadingLessonBody } from "@/routes/courses/_components/course-learn/ReadingLessonBody";
import type {
  CurriculumProps,
  FlatItem,
  Tab,
} from "@/routes/courses/_components/course-learn/types";
import {
  useCurriculumItems,
  useInProgressInterviewSessions,
  useModuleItemsMap,
  useMyInterviewProgress,
  useMyQuizProgress,
} from "@/routes/courses/_components/course-learn/use-curriculum";
import {
  useActiveLessonContent,
  useLessonStatusMap,
  type LessonLockRequirements,
} from "@/routes/courses/_components/course-learn/use-lesson-content";
import { QuizFullscreenGateScreen } from "@/routes/courses/_components/course-quiz/QuizFullscreenGateScreen";
import { getQuizBlockingStage } from "@/routes/courses/_components/course-quiz/QuizGuardScreens";
import { QuizIntroStage } from "@/routes/courses/_components/course-quiz/QuizIntroStage";
import {
  QuizLoadingSkeleton,
  QuizNoQuestionsPanel,
  QuizNotFoundPanel,
} from "@/routes/courses/_components/course-quiz/QuizStatusScreens";
import { QuizTakingStage } from "@/routes/courses/_components/course-quiz/QuizTakingStage";
import { LessonKnowledgeMap } from "@/routes/courses/_components/LessonKnowledgeMap";
import { QuizResultScreen } from "@/routes/courses/_components/QuizResultScreen";

/**
 * Unified student item route: /courses/$slug/learn/$itemSlug
 * Resolves $itemSlug against the course curriculum tree (slug preferred,
 * id fallback for UUID-era bookmarks) then dispatches by item_type.
 * Breadcrumb: Courses / <course> / Learn / <item>
 */
export default function CourseLearnItemPage() {
  const { slug, itemSlug } = useParams({ strict: false }) as {
    slug: string;
    itemSlug: string;
  };
  const search = useSearch({ strict: false }) as {
    start?: boolean | string | number;
  };
  const { t } = useTranslation();

  const courseQuery = useCourseBySlug(slug);
  const course = courseQuery.data;
  const courseId = course?.id;
  const contentQuery = useCourseContent(courseId);

  const sortedModules = useMemo(() => {
    if (!contentQuery.data) return [];
    return [...contentQuery.data.modules].sort(
      (a, b) => a.position - b.position,
    );
  }, [contentQuery.data]);

  const itemsByModule = useModuleItemsMap(sortedModules);
  const { flatItems, lessonItems } = useCurriculumItems(
    sortedModules,
    itemsByModule,
    t,
  );

  const matched = useMemo<FlatItem | null>(() => {
    if (!itemSlug || !flatItems.length) return null;
    let found = flatItems.find((fi) => fi.item.target?.slug === itemSlug);
    if (!found) found = flatItems.find((fi) => fi.item.target?.id === itemSlug);
    if (!found) found = flatItems.find((fi) => fi.item.id === itemSlug);
    return found ?? null;
  }, [flatItems, itemSlug]);

  if (courseQuery.isLoading || contentQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-3 w-64">
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse" />
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  const courseUnavailable =
    courseQuery.isError &&
    courseQuery.error instanceof ApiError &&
    courseQuery.error.status === 404;
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

  if (!matched) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <Breadcrumbs
            items={[
              { label: t("course_detail.breadcrumb_courses"), to: "/courses" },
              { label: course.title, to: "/courses/$slug", params: { slug } },
              {
                label: t("course_learn.breadcrumb_learn"),
                to: "/courses/$slug/learn",
                params: { slug },
              },
              { label: itemSlug },
            ]}
          />
          <p className="font-headline font-bold text-xl text-m3-on-surface mt-4">
            {t("course_learn.item_not_found_title")}
          </p>
          <p className="text-sm text-m3-on-surface-variant">
            {t("course_learn.item_not_found_body", { item: itemSlug })}
          </p>
          <Link to="/courses/$slug/learn" params={{ slug }}>
            <Button className="gradient-primary text-white rounded-xl">
              {t("course_learn.back_to_learn")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const itemTitle = matched.label || matched.item.target?.title || itemSlug;
  return (
    <MatchedItemView
      slug={slug}
      course={course}
      matched={matched}
      itemTitle={itemTitle}
      itemSlug={itemSlug}
      start={search.start}
      sortedModules={sortedModules}
      flatItems={flatItems}
      lessonItems={lessonItems}
    />
  );
}

/**
 * Renders the matched item's stage (lesson player / quiz taking / interview
 * room) under a breadcrumb. Extracted from the page shell so the URL
 * resolution logic stays readable; see CourseLearnItemPage.
 */
function MatchedItemView({
  slug,
  course,
  matched,
  itemTitle,
  itemSlug,
  start,
  sortedModules,
  flatItems,
  lessonItems,
}: {
  slug: string;
  course: CoursePublic;
  matched: FlatItem;
  itemTitle: string;
  itemSlug: string;
  start: unknown;
  sortedModules: ModulePublic[];
  flatItems: FlatItem[];
  lessonItems: FlatItem[];
}) {
  const { t } = useTranslation();
  const breadcrumb = (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <Breadcrumbs
        items={[
          { label: t("course_detail.breadcrumb_courses"), to: "/courses" },
          { label: course.title, to: "/courses/$slug", params: { slug } },
          {
            label: t("course_learn.breadcrumb_learn"),
            to: "/courses/$slug/learn",
            params: { slug },
          },
          { label: itemTitle },
        ]}
      />
    </div>
  );

  if (matched.item.item_type === "lesson") {
    return (
      <>
        {breadcrumb}
        <LessonItemView
          slug={slug}
          courseId={course.id}
          course={course}
          matched={matched}
          sortedModules={sortedModules}
          flatItems={flatItems}
          lessonItems={lessonItems}
        />
      </>
    );
  }

  if (matched.item.item_type === "quiz") {
    const quizRef = matched.item.target?.id || itemSlug;
    return (
      <QuizProxy
        slug={slug}
        quizRef={quizRef}
        startParam={start}
        breadcrumb={breadcrumb}
      />
    );
  }

  if (matched.item.item_type === "interview") {
    const interviewRef = matched.item.target?.id || itemSlug;
    return <InterviewProxy slug={slug} interviewRef={interviewRef} />;
  }

  return null;
}

function LessonItemView({
  slug,
  courseId,
  course,
  matched,
  sortedModules,
  flatItems,
  lessonItems,
}: {
  slug: string;
  courseId: string;
  course: CoursePublic;
  matched: FlatItem;
  sortedModules: ModulePublic[];
  flatItems: FlatItem[];
  lessonItems: FlatItem[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("Lesson Notes");
  const { activeLessonId, activeLesson, lessonUnavailable, lessonLock, resources } =
    useActiveLessonContent(matched as FlatItem, activeTab);
  const playerRef = useRef<HTMLDivElement | null>(null);

  // Curriculum rail state — same hook order as course-learn.tsx (quiz
  // progress before interview progress, see use-curriculum.ts).
  const lessonStatusMap = useLessonStatusMap(courseId);
  const quizProgressMap = useMyQuizProgress(courseId);
  const interviewProgressMap = useMyInterviewProgress(courseId);
  const inProgressByConfigId = useInProgressInterviewSessions(courseId);

  const lockedLessonIds = lessonLock && activeLessonId
    ? new Set([activeLessonId])
    : undefined;
  const itemState = (fi: FlatItem) =>
    itemStateFor(
      fi,
      activeLessonId,
      lessonStatusMap,
      quizProgressMap,
      interviewProgressMap,
      lockedLessonIds,
    );
  // Earliest item still to do — highlighted in the rail so the eye lands on
  // the next step after finishing this lesson.
  const nextItemId = useMemo(
    () => earliestPendingItemId(flatItems, itemState),
    [flatItems, itemState],
  );
  // Selecting another curriculum item navigates to the same unified item
  // route (slug preferred, id fallback for UUID-era bookmarks). Same
  // index-into-lessonItems contract as course-learn.tsx openLesson().
  const onSelect = (idx: number) => {
    const fi = lessonItems[idx];
    if (!fi) return;
    void navigate({
      to: "/courses/$slug/learn/$itemSlug",
      params: {
        slug,
        itemSlug: fi.item.target?.slug || fi.item.target?.id || fi.item.id,
      },
      search: { start: false },
    });
  };

  const curriculum: CurriculumProps = {
    sortedModules,
    flatItems,
    lessonItems,
    itemState,
    onSelect,
    slug,
    activeModuleId: matched.item.module_id,
    inProgressByConfigId,
    interviewProgressMap,
    nextItemId,
  };
  const activeIndex = lessonItems.findIndex(
    (fi) => fi.item.id === matched.item.id,
  );

  if (lessonLock) {
    return (
      <LessonLockedView
        course={course}
        curriculum={curriculum}
        lock={lessonLock}
      />
    );
  }

  if (lessonUnavailable) {
    return (
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <GlassCard className="p-10 text-center mt-6">
          <p className="font-headline font-bold text-xl text-m3-on-surface mb-2">
            {t("course_learn.lesson_unavailable_title")}
          </p>
          <p className="text-sm text-m3-on-surface-variant">
            {t("course_learn.lesson_unavailable_body")}
          </p>
        </GlassCard>
      </div>
    );
  }

  if (!activeLesson) {
    return (
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-3 w-64 mt-6">
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse" />
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 sm:pb-24">
      <div className="mx-auto max-w-[1800px] px-3 pt-2 sm:px-6 lg:px-8">
        {/* 70/30: player + knowledge map in the main column, curriculum rail
            on the right (desktop) / below the content on mobile. */}
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-6">
            <LessonHeadingBlock
              title={matched.label || activeLesson.title}
              moduleTitle={matched.moduleTitle}
              activeLessonId={activeLessonId}
              courseId={courseId}
              lessonStatusMap={lessonStatusMap}
            />
            <LessonContentPane
              activeLesson={activeLesson}
              courseId={courseId}
              playerRef={playerRef}
              activeLessonId={activeLessonId}
            />
            <LessonKnowledgeMap lessonId={activeLesson.id} />
            <LessonTabsSection
              activeTab={activeTab}
              onTabChange={setActiveTab}
              activeLessonId={activeLessonId}
              resources={resources}
              hasPrev={activeIndex > 0}
              hasNext={activeIndex < lessonItems.length - 1}
              onPrev={() => onSelect(Math.max(0, activeIndex - 1))}
              onNext={() =>
                onSelect(Math.min(lessonItems.length - 1, activeIndex + 1))
              }
              prevLabel={lessonItems[activeIndex - 1]?.label}
              nextLabel={lessonItems[activeIndex + 1]?.label}
            />
          </div>
          <CurriculumSidebar
            {...curriculum}
            instructors={resolveCourseInstructors(course)}
          />
        </div>
      </div>
    </div>
  );
}

function LessonLockedView({
  course,
  curriculum,
  lock,
}: {
  course: CoursePublic;
  curriculum: CurriculumProps;
  lock: LessonLockRequirements;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen pb-16 sm:pb-24">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4 px-3 pt-2 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
        <GlassCard className="min-w-0 flex-1 space-y-4 p-6 sm:p-10">
          <div className="space-y-2">
            <h2 className="font-headline text-xl font-bold text-m3-on-surface sm:text-2xl">
              {t("course_learn.lesson_locked_title")}
            </h2>
            <p className="text-sm leading-relaxed text-m3-on-surface-variant">
              {t("course_learn.lesson_locked_body")}
            </p>
          </div>
          <div className="space-y-2 rounded-xl bg-m3-surface-container-low p-4 text-sm text-m3-on-surface-variant">
            <p>
              {t("course_learn.lesson_locked_progress", {
                passing: lock.passingCards,
                total: lock.totalCards,
                required: Math.round(lock.requiredRatio * 100),
              })}
            </p>
            {!lock.prerequisitesMet && (
              <p>{t("course_learn.lesson_locked_prerequisites")}</p>
            )}
            {lock.interviewPassRequired && !lock.interviewPassed && (
              <p>{t("course_learn.lesson_locked_interview")}</p>
            )}
            {lock.nextUnlockEstimate && <p>{lock.nextUnlockEstimate}</p>}
          </div>
        </GlassCard>
        <CurriculumSidebar
          {...curriculum}
          instructors={resolveCourseInstructors(course)}
        />
      </div>
    </div>
  );
}

function LessonContentPane({
  activeLesson,
  courseId,
  playerRef,
}: {
  activeLesson: LessonPublic;
  courseId: string;
  playerRef: React.RefObject<HTMLDivElement | null>;
  activeLessonId?: string;
}) {
  const { t } = useTranslation();
  const materialId = activeLesson.primary_material_id ?? null;
  const streamQuery = useStreamUrl(materialId);
  const streamUrl = streamQuery.data?.url ?? null;
  const materialVersionId = streamQuery.data?.material_version_id ?? null;
  const readingContentRef = useRef<HTMLDivElement>(null);
  useLessonEngagementTracker({
    materialVersionId:
      activeLesson.lesson_type === "reading" ? materialVersionId : null,
    lessonId: activeLesson.id,
    courseId,
    contentRef: readingContentRef,
  });

  if (activeLesson.lesson_type === "reading") {
    return (
      <div ref={readingContentRef}>
        <GlassCard
          className="mt-2 space-y-6 p-4 sm:p-6"
          data-testid="course-learn-reading"
        >
          <ReadingLessonBody
            lesson={activeLesson}
            materialId={materialId}
            streamUrl={streamUrl}
            isLoading={streamQuery.isLoading}
            t={t}
          />
        </GlassCard>
      </div>
    );
  }
  return (
    <LessonVideoPlayer
      lesson={activeLesson}
      courseId={courseId}
      containerRef={playerRef}
    />
  );
}

function QuizProxy({
  slug,
  quizRef,
  startParam,
  breadcrumb,
}: {
  slug: string;
  quizRef: string;
  startParam: unknown;
  breadcrumb: React.ReactNode;
}) {
  return (
    <QuizProxyInner
      slug={slug}
      quizId={quizRef}
      startParam={startParam}
      breadcrumb={breadcrumb}
    />
  );
}

function QuizProxyInner({
  slug,
  quizId,
  startParam,
  breadcrumb,
}: {
  slug: string;
  quizId: string;
  startParam: unknown;
  breadcrumb: React.ReactNode;
}) {
  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const session = useQuizAttemptSession(quizId);
  const { quiz, taking, submittedSummary, displayQuestions } = session;
  const autoStarted = useRef(false);
  const shouldStart =
    startParam === true ||
    startParam === "1" ||
    startParam === 1 ||
    startParam === "true";

  useEffect(() => {
    if (shouldStart && !taking && !submittedSummary && !autoStarted.current) {
      autoStarted.current = true;
      void session.handleStartAttempt();
    }
  }, [shouldStart, taking, submittedSummary, session]);

  if (
    courseLoading ||
    session.quizLoading ||
    session.attemptsLoading ||
    session.resuming
  ) {
    return <QuizLoadingSkeleton />;
  }
  if (!course || !quiz) {
    return <QuizNotFoundPanel slug={slug} />;
  }
  const blockingStage = getQuizBlockingStage({ session, slug });
  if (blockingStage) return blockingStage;
  if (submittedSummary) {
    return (
      <>
        {breadcrumb}
        <div className="max-w-[1800px] mx-auto">
          <QuizResultScreen
            quiz={quiz}
            summary={submittedSummary}
            totalQuestionsFallback={displayQuestions.length}
            slug={slug}
          />
        </div>
      </>
    );
  }

  if (taking && displayQuestions.length > 0) {
    if (session.fullscreen.requiredOpen) {
      return (
        <QuizFullscreenGateScreen
          gate={session.fullscreen}
          timed={Boolean(quiz.time_limit_seconds)}
        />
      );
    }
    return (
      <QuizTakingStage
        session={session}
        quiz={quiz}
        slug={slug}
        courseTitle={course.title}
      />
    );
  }
  if (!taking) {
    return (
      <>
        {breadcrumb}
        <div className="max-w-[1800px] mx-auto">
          <QuizIntroStage
            session={session}
            quiz={quiz}
            slug={slug}
            courseTitle={course?.title}
            hasBreadcrumb
          />
        </div>
      </>
    );
  }
  // Taking but the live payload carries zero questions — defensive notice.
  return (
    <>
      {breadcrumb}
      <div className="max-w-[1800px] mx-auto">
        <QuizNoQuestionsPanel slug={slug} />
      </div>
    </>
  );
}

function InterviewProxy({
  slug,
  interviewRef,
}: {
  slug: string;
  interviewRef: string;
}) {
  return <InterviewProxyInner slug={slug} interviewRef={interviewRef} />;
}

function InterviewProxyInner({
  slug,
  interviewRef,
}: {
  slug: string;
  interviewRef: string;
}) {
  const iv = useCourseInterviewWithRef(slug, interviewRef);
  const { course, config, finishResult, sessionId } = iv;
  // Same five-provider-prop policy as course-interview.tsx: the mandatory
  // fullscreen gate first (no fullscreen → every capability false), End/timer
  // moves the phase to `closing` synchronously, and that terminal state
  // disconnects the room / unmounts RoomAudioRenderer so agent audio cannot
  // bleed into the closing/result screen. A `natural` closing is the
  // exception — the agent is reading the goodbye over LiveKit and the room
  // stays live until the farewell presents and the phase advances to results
  // (see interviewRoomProps in agent-voice-presentation).
  const roomProps = interviewRoomProps({
    sessionId,
    phase: iv.phase,
    finishResult,
    closingReason: iv.closingReason,
    onboardingStage: iv.onboardingStage,
    pendingFirstQuestion: iv.pendingFirstQuestion,
    micOn: iv.micOn,
    fullscreenGranted: iv.fullscreenGate.isFullscreen,
    cameraGranted: !cameraGateBlocks(iv.cameraGate),
  });

  const screen = (() => {
    if (iv.courseLoading || iv.configLoading) return <InterviewLoadingScreen />;
    if (!course || !config)
      return <InterviewMissingConfigScreen slug={iv.slug} />;
    if (finishResult)
      return (
        <InterviewResultsScreen iv={iv as never} finishResult={finishResult} />
      );
    if (!sessionId)
      return (
        <InterviewLobbyScreen
          iv={iv as never}
          course={course}
          config={config}
        />
      );
    if (iv.fullscreenGate.requiredOpen)
      return <InterviewFullscreenGateScreen iv={iv as never} />;
    if (cameraGateBlocks(iv.cameraGate))
      return <InterviewCameraGateScreen camera={iv.cameraGate} />;
    return (
      <InterviewWorkspaceScreen
        iv={iv as never}
        course={course}
        config={config}
      />
    );
  })();

  return (
    <InterviewRoomProvider
      sessionId={sessionId}
      active={roomProps.active}
      prefetch={roomProps.prefetch}
      warm={roomProps.warm}
      agentWanted={roomProps.agentWanted}
      audio={roomProps.audio}
    >
      {screen}
    </InterviewRoomProvider>
  );
}
