import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ApiError } from "@/lib/api/client";
import { useCourseBySlug, useCourseContent } from "@/lib/api/hooks/courses";
import { useStreamUrl } from "@/lib/api/hooks/materials";
import { useLessonEngagementTracker } from "@/lib/hooks/useLessonEngagementTracker";
import { LessonKnowledgeMap } from "@/routes/courses/_components/LessonKnowledgeMap";
import { CurriculumSidebar } from "@/routes/courses/_components/course-learn/CurriculumSidebar";
import { ReadingLessonBody } from "@/routes/courses/_components/course-learn/ReadingLessonBody";
import { LessonTabsSection } from "@/routes/courses/_components/course-learn/LessonTabsSection";
import { LessonPlayerFrame, VideoEngagementTracker } from "@/routes/courses/_components/course-learn/LessonPlayerFrame";
import {
  useCurriculumItems,
  useInProgressInterviewSessions,
  useModuleItemsMap,
  useMyInterviewProgress,
  useMyQuizProgress,
} from "@/routes/courses/_components/course-learn/use-curriculum";
import { useActiveLessonContent, useLessonStatusMap } from "@/routes/courses/_components/course-learn/use-lesson-content";
import { earliestPendingItemId, itemStateFor } from "@/routes/courses/_components/course-learn/helpers";
import type { CurriculumProps, FlatItem, Tab } from "@/routes/courses/_components/course-learn/types";
import type { CoursePublic, LessonPublic, ModulePublic } from "@/lib/api/types";
import { useQuizAttemptSession } from "@/lib/quiz/use-quiz-attempt-session";
import { QuizIntroStage } from "@/routes/courses/_components/course-quiz/QuizIntroStage";
import { QuizTakingStage } from "@/routes/courses/_components/course-quiz/QuizTakingStage";
import { QuizResultScreen } from "@/routes/courses/_components/QuizResultScreen";
import {
  QuizLoadingSkeleton,
  QuizNoQuestionsPanel,
  QuizNotFoundPanel,
} from "@/routes/courses/_components/course-quiz/QuizStatusScreens";
import { InterviewRoomProvider } from "@/components/interview/interview-room-provider";
import { interviewRoomProps } from "@/routes/courses/_components/course-interview/agent-voice-presentation";
import { InterviewLobbyScreen } from "@/routes/courses/_components/course-interview/InterviewLobbyScreen";
import { InterviewResultsScreen } from "@/routes/courses/_components/course-interview/InterviewResultsScreen";
import {
  InterviewLoadingScreen,
  InterviewMissingConfigScreen,
} from "@/routes/courses/_components/course-interview/InterviewStatusScreens";
import { InterviewWorkspaceScreen } from "@/routes/courses/_components/course-interview/InterviewWorkspaceScreen";
import { useCourseInterviewWithRef } from "@/routes/courses/_components/course-interview/use-course-interview-with-ref";

/**
 * Unified student item route: /courses/$slug/learn/$itemSlug
 * Resolves $itemSlug against the course curriculum tree (slug preferred,
 * id fallback for UUID-era bookmarks) then dispatches by item_type.
 * Breadcrumb: Courses / <course> / Learn / <item>
 */
export default function CourseLearnItemPage() {
  const { slug, itemSlug } = useParams({ strict: false }) as { slug: string; itemSlug: string };
  const search = useSearch({ strict: false }) as { start?: boolean | string | number };
  const { t } = useTranslation();

  const courseQuery = useCourseBySlug(slug);
  const course = courseQuery.data;
  const courseId = course?.id;
  const contentQuery = useCourseContent(courseId);

  const sortedModules = useMemo(() => {
    if (!contentQuery.data) return [];
    return [...contentQuery.data.modules].sort((a, b) => a.position - b.position);
  }, [contentQuery.data]);

  const itemsByModule = useModuleItemsMap(sortedModules);
  const { flatItems, lessonItems } = useCurriculumItems(sortedModules, itemsByModule, t);

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
    courseQuery.isError && courseQuery.error instanceof ApiError && courseQuery.error.status === 404;
  if (courseUnavailable || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-m3-on-surface font-headline font-bold text-xl">{t("course_detail.unavailable_title")}</p>
          <p className="text-sm text-m3-on-surface-variant">{t("course_detail.unavailable_body")}</p>
          <Link to="/courses">
            <Button className="gradient-primary text-white rounded-xl gap-2">
              {t("course_detail.browse_courses")} <ArrowRight className="h-4 w-4" />
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
              { label: t("course_learn.breadcrumb_learn"), to: "/courses/$slug/learn", params: { slug } },
              { label: itemSlug },
            ]}
          />
          <p className="font-headline font-bold text-xl text-m3-on-surface mt-4">{t("course_learn.item_not_found_title")}</p>
          <p className="text-sm text-m3-on-surface-variant">
            {t("course_learn.item_not_found_body", { item: itemSlug })}
          </p>
          <Link to="/courses/$slug/learn" params={{ slug }}>
            <Button className="gradient-primary text-white rounded-xl">{t("course_learn.back_to_learn")}</Button>
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
          { label: t("course_learn.breadcrumb_learn"), to: "/courses/$slug/learn", params: { slug } },
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
          matched={matched}
          sortedModules={sortedModules}
          flatItems={flatItems}
          lessonItems={lessonItems}
        />
      </>
    );
  }

  if (matched.item.item_type === "quiz") {
    // Resolve the taking payload by the item's ID (the course tree is the
    // authority once the URL matched here): slugs are only unique per
    // module, so a bare slug could be ambiguous across courses — and the
    // learner API 404s an ambiguous slug even though this link is valid.
    const quizRef = matched.item.target?.id || itemSlug;
    return (
      <>
        {breadcrumb}
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <QuizProxy slug={slug} quizRef={quizRef} startParam={start} />
        </div>
      </>
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
  matched,
  sortedModules,
  flatItems,
  lessonItems,
}: {
  slug: string;
  courseId: string;
  matched: FlatItem;
  sortedModules: ModulePublic[];
  flatItems: FlatItem[];
  lessonItems: FlatItem[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("Lesson Notes");
  const { activeLessonId, activeLesson, lessonUnavailable, resources } =
    useActiveLessonContent(matched as FlatItem, activeTab);
  const playerRef = useRef<HTMLDivElement | null>(null);

  // Curriculum rail state — same hook order as course-learn.tsx (quiz
  // progress before interview progress, see use-curriculum.ts).
  const lessonStatusMap = useLessonStatusMap(courseId);
  const quizProgressMap = useMyQuizProgress(courseId);
  const interviewProgressMap = useMyInterviewProgress(courseId);
  const inProgressByConfigId = useInProgressInterviewSessions(courseId);

  const itemState = (fi: FlatItem) =>
    itemStateFor(
      fi,
      activeLessonId,
      lessonStatusMap,
      quizProgressMap,
      interviewProgressMap,
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

  if (lessonUnavailable) {
    return (
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <GlassCard className="p-10 text-center mt-6">
          <p className="font-headline font-bold text-xl text-m3-on-surface mb-2">{t("course_learn.lesson_unavailable_title")}</p>
          <p className="text-sm text-m3-on-surface-variant">{t("course_learn.lesson_unavailable_body")}</p>
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
    <div className="min-h-screen pb-24">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-2">
        {/* 70/30: player + knowledge map in the main column, curriculum rail
            on the right (desktop) / below the content on mobile. */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            <LessonContentPane activeLesson={activeLesson} courseId={courseId} playerRef={playerRef} activeLessonId={activeLessonId} />
            <LessonKnowledgeMap lessonId={activeLesson.id} />
            <LessonTabsSection
              activeTab={activeTab}
              onTabChange={setActiveTab}
              activeLessonId={activeLessonId}
              resources={resources}
              hasPrev={lessonItems.findIndex((fi) => fi.item.id === matched.item.id) > 0}
              hasNext={lessonItems.findIndex((fi) => fi.item.id === matched.item.id) < lessonItems.length - 1}
              onPrev={() => onSelect(Math.max(0, lessonItems.findIndex((fi) => fi.item.id === matched.item.id) - 1))}
              onNext={() => onSelect(Math.min(lessonItems.length - 1, lessonItems.findIndex((fi) => fi.item.id === matched.item.id) + 1))}
              prevLabel={lessonItems[lessonItems.findIndex((fi) => fi.item.id === matched.item.id) - 1]?.label}
              nextLabel={lessonItems[lessonItems.findIndex((fi) => fi.item.id === matched.item.id) + 1]?.label}
            />
          </div>
          <CurriculumSidebar {...curriculum} />
        </div>
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
  useLessonEngagementTracker({ materialVersionId, lessonId: activeLesson.id, courseId });

  if (activeLesson.lesson_type === "reading") {
    return (
      <GlassCard className="p-6 sm:p-8 space-y-6 mt-2" data-testid="course-learn-reading">
        <ReadingLessonBody lesson={activeLesson} materialId={materialId} streamUrl={streamUrl} isLoading={streamQuery.isLoading} t={t} />
      </GlassCard>
    );
  }
  return (
    <>
      <VideoEngagementTracker lesson={activeLesson} courseId={courseId} />
      <LessonPlayerFrame containerRef={playerRef} showPlayButton />
    </>
  );
}

function QuizProxy({ slug, quizRef, startParam }: { slug: string; quizRef: string; startParam: unknown }) {
  return <QuizProxyInner slug={slug} quizId={quizRef} startParam={startParam} />;
}

function QuizProxyInner({ slug, quizId, startParam }: { slug: string; quizId: string; startParam: unknown }) {
  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const session = useQuizAttemptSession(quizId);
  const { quiz, taking, submittedSummary, displayQuestions } = session;
  const autoStarted = useRef(false);
  const shouldStart = startParam === true || startParam === "1" || startParam === 1 || startParam === "true";

  useEffect(() => {
    if (shouldStart && !taking && !submittedSummary && !autoStarted.current) {
      autoStarted.current = true;
      void session.handleStartAttempt();
    }
  }, [shouldStart, taking, submittedSummary, session]);

  if (courseLoading || session.quizLoading || session.attemptsLoading || session.resuming) {
    return <QuizLoadingSkeleton />;
  }
  if (!course || !quiz) {
    return <QuizNotFoundPanel slug={slug} />;
  }
  if (submittedSummary) {
    return <QuizResultScreen quiz={quiz} summary={submittedSummary} totalQuestionsFallback={displayQuestions.length} slug={slug} />;
  }
  if (!taking) {
    return <QuizIntroStage session={session} quiz={quiz} slug={slug} courseTitle={course?.title} />;
  }
  if (displayQuestions.length === 0) {
    return <QuizNoQuestionsPanel slug={slug} />;
  }
  return <QuizTakingStage session={session} quiz={quiz} slug={slug} courseTitle={course.title} />;
}

function InterviewProxy({ slug, interviewRef }: { slug: string; interviewRef: string }) {
  return <InterviewProxyInner slug={slug} interviewRef={interviewRef} />;
}

function InterviewProxyInner({ slug, interviewRef }: { slug: string; interviewRef: string }) {
  const iv = useCourseInterviewWithRef(slug, interviewRef);
  const { course, config, finishResult, sessionId } = iv;
  // Same five-provider-prop policy as course-interview.tsx: End/timer moves
  // the phase to `closing` synchronously, and that terminal state disconnects
  // the room / unmounts RoomAudioRenderer so agent audio cannot bleed into the
  // closing/result screen. A `natural` closing is the exception — the agent is
  // reading the goodbye over LiveKit and the room stays live until the
  // farewell presents and the phase advances to results
  // (see interviewRoomProps in agent-voice-presentation).
  const roomProps = interviewRoomProps({
    sessionId,
    phase: iv.phase,
    finishResult,
    closingReason: iv.closingReason,
    onboardingStage: iv.onboardingStage,
    pendingFirstQuestion: iv.pendingFirstQuestion,
    micOn: iv.micOn,
  });

  let screen: React.ReactNode;
  if (iv.courseLoading || iv.configLoading) screen = <InterviewLoadingScreen />;
  else if (!course || !config) screen = <InterviewMissingConfigScreen slug={iv.slug} />;
  else if (finishResult) screen = <InterviewResultsScreen iv={iv as never} finishResult={finishResult} />;
  else if (!sessionId) screen = <InterviewLobbyScreen iv={iv as never} course={course} config={config} />;
  else screen = <InterviewWorkspaceScreen iv={iv as never} course={course} config={config} />;

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
