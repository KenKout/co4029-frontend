import { useMemo, useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ApiError } from "@/lib/api/client";
import { useCourseBySlug, useCourseContent } from "@/lib/api/hooks/courses";
import { useStreamUrl } from "@/lib/api/hooks/materials";
import { useLessonEngagementTracker } from "@/lib/hooks/useLessonEngagementTracker";
import { LessonKnowledgeMap } from "@/routes/_components/LessonKnowledgeMap";
import type { LessonPublic, ModulePublic } from "@/lib/api/types";
import { CourseHome } from "./_components/course-learn/CourseHome";
import type { CourseHomeProps } from "./_components/course-learn/CourseHome";
import { CurriculumSidebar } from "./_components/course-learn/CurriculumSidebar";
import { InstructorBlock } from "./_components/course-learn/InstructorBlock";
import { LearnBreadcrumb } from "./_components/course-learn/LearnBreadcrumb";
import { LessonHeadingBlock } from "./_components/course-learn/LessonHeadingBlock";
import {
  LessonPlayerFrame,
  VideoEngagementTracker,
} from "./_components/course-learn/LessonPlayerFrame";
import { LessonTabsSection } from "./_components/course-learn/LessonTabsSection";
import { NoLessonsNotice } from "./_components/course-learn/NoLessonsNotice";
import { ReadingLessonBody } from "./_components/course-learn/ReadingLessonBody";
import {
  activeTitleFor,
  deriveShowHome,
  earliestPendingItemId,
  itemStateFor,
} from "./_components/course-learn/helpers";
import type {
  CurriculumProps,
  FlatItem,
  Tab,
} from "./_components/course-learn/types";
import {
  useCurriculumItems,
  useInProgressInterviewSessions,
  useModuleItemsMap,
  useMyQuizProgress,
} from "./_components/course-learn/use-curriculum";
import {
  useActiveLessonContent,
  useLessonStatusMap,
} from "./_components/course-learn/use-lesson-content";
import {
  useApplyDeepLink,
  useLearnUrlState,
} from "./_components/course-learn/use-learn-url-state";
import type { LearnUrlState } from "./_components/course-learn/use-learn-url-state";

export default function CourseLearnPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };

  const courseQuery = useCourseBySlug(slug);
  const course = courseQuery.data;
  const courseId = course?.id;
  const { data: content, isLoading: contentLoading } =
    useCourseContent(courseId);

  const sortedModules = useMemo<ModulePublic[]>(() => {
    if (!content) return [];
    return [...content.modules].sort((a, b) => a.position - b.position);
  }, [content]);

  const courseUnavailable =
    courseQuery.isError &&
    courseQuery.error instanceof ApiError &&
    courseQuery.error.status === 404;

  return (
    <CourseLearnView
      slug={slug}
      courseLoading={courseQuery.isLoading}
      courseUnavailable={courseUnavailable}
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
  course,
  contentLoading,
  sortedModules,
}: {
  slug: string;
  courseLoading: boolean;
  courseUnavailable: boolean;
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
  const { flatItems, lessonItems } = useCurriculumItems(
    sortedModules,
    itemsByModule,
    t,
  );
  const inProgressByConfigId = useInProgressInterviewSessions(course.id);
  // Quiz completion (passed OR failed-with-attempts-exhausted) lets quiz
  // items participate in auto-collapse + next-item highlighting.
  const quizProgressMap = useMyQuizProgress(course.id);

  const [activeIdx, setActiveIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("Lesson Notes");

  // ── DEV: lock-bypass (commented out) ──
  // const [devBypassLocks, setDevBypassLocks] = useState(
  //   () => localStorage.getItem("dev_bypass_locks") === "1"
  // );
  // const { data: srOverview } = useCourseSrOverview(course.id);
  // const lockedLessonIds = useMemo(() => {
  //   if (devBypassLocks) return new Set<string>();
  //   const set = new Set<string>();
  //   for (const row of srOverview ?? []) {
  //     if (row.eligible === false) set.add(row.lesson_id);
  //   }
  //   return set;
  // }, [srOverview, devBypassLocks]);
  // const activeLesson = devBypassLocks && !lessonQuery.data && activeEntry?.item.target
  //   ? (activeEntry.item.target as LessonPublic)
  //   : (lessonQuery.data ?? null);
  // const lessonLocked =
  //   !devBypassLocks &&
  //   lessonQuery.isError &&
  //   lessonQuery.error instanceof ApiError &&
  //   lessonQuery.error.status === 403 &&
  //   (lessonQuery.error.parsedBody as { detail?: { error?: string } } | null)?.detail?.error ===
  //     "lesson_locked";
  // const unlockDetail = (() => {
  //   if (!lessonLocked) return null;
  //   const err = lessonQuery.error as ApiError;
  //   const body = err.parsedBody as {
  //     detail?: {
  //       error?: string;
  //       prerequisites_met?: boolean;
  //       current_ratio?: number;
  //       required_ratio?: number;
  //       total_cards?: number;
  //       passing_cards?: number;
  //       interview_pass_required?: boolean;
  //       interview_passed?: boolean;
  //       next_unlock_estimate?: string | null;
  //     };
  //   } | null;
  //   const d = body?.detail;
  //   if (!d) return null;
  //   const prereqsMet = d.prerequisites_met ?? null;
  //   const efRatio = d.current_ratio != null && d.required_ratio != null ? { current: d.current_ratio, required: d.required_ratio } : null;
  //   const totalCards = d.total_cards ?? 0;
  //   const passingCards = d.passing_cards ?? 0;
  //   const interviewReq = d.interview_pass_required ?? false;
  //   const interviewPassed = d.interview_passed ?? false;
  //   const estimate = d.next_unlock_estimate ?? null;
  //   return { prereqsMet, efRatio, totalCards, passingCards, interviewReq, interviewPassed, estimate };
  // })();
  // ───────────────────────────────────────

  const activeEntry = lessonItems[activeIdx] ?? null;
  const { activeLessonId, activeLesson, lessonUnavailable, resources } =
    useActiveLessonContent(activeEntry, activeTab);
  const lessonStatusMap = useLessonStatusMap(course.id);

  const urlState = useLearnUrlState(lessonItems, lessonStatusMap);
  const {
    search,
    navigate,
    playerRef,
    seekSeconds,
    targetPage,
    targetAnchor,
    resumeIdx,
    completedCount,
  } = urlState;

  // Course-home landing: when the student arrives WITHOUT a content deep-link
  // (?t= seek / ?p= page / #anchor), show a course-home overview (progress +
  // continue button + full curriculum) instead of dropping straight into
  // lesson 1. Selecting a lesson — or arriving via a deep-link — switches to
  // the focused player view. This gives students an orientation/"what's next"
  // surface the cramped sidebar can't, and makes the full curriculum visible
  // on arrival (the reason the tiny sidebar felt like the only navigation).
  // DERIVED from the URL rather than held in state.
  //
  // This used to be `useState`, kept in sync by hand from openLesson/goHome and
  // from the ?item restore effect. That produced two bugs:
  //   1. Clicking the "Learn" crumb appeared to do nothing — router navigation
  //      is async, and because `lessonItems` isn't referentially stable (it
  //      derives from `t`), the restore effect re-ran with the still-present
  //      stale ?item and immediately flipped showHome back to false.
  //   2. Browser Back only changes the search param (the component stays
  //      mounted), and nothing flipped showHome back to true — so Back from a
  //      lesson left the lesson on screen.
  // Deriving it makes the URL the single source of truth: ?item present = a
  // lesson is open, absent = course-home. Back/Forward then work for free.
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
    itemStateFor(fi, activeLessonId, lessonStatusMap, quizProgressMap);
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
    nextItemId,
  };

  if (!lessonItems.length) {
    return <NoLessonsNotice slug={slug} />;
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <LearnBreadcrumb
          slug={slug}
          courseTitle={course.title}
          showHome={showHome}
          onGoHome={goHome}
          activeTitle={activeTitle}
        />

        {/* ── DEV: lock-bypass toggle (commented out) ──
        <div className="flex items-center justify-end mb-2">
          <button
            onClick={() => {
              const next = !devBypassLocks;
              setDevBypassLocks(next);
              localStorage.setItem("dev_bypass_locks", next ? "1" : "0");
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all",
              devBypassLocks
                ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:opacity-90"
                : "bg-m3-surface-container border-m3-outline text-m3-on-surface-variant hover:bg-primary/10 hover:border-primary/30 hover:text-primary hover:opacity-90"
            )}
          >
            {devBypassLocks ? "🔒 DEV: Locking" : "🔓 DEV: Unlock All"}
          </button>
        </div>
        ─────────────────────────────────────────────── */}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            <LessonMainPane
              showHome={showHome}
              lessonUnavailable={lessonUnavailable}
              activeLesson={activeLesson}
              courseId={course.id}
              playerRef={playerRef}
              homeProps={{
                ...curriculum,
                course,
                completedCount,
                totalLessons: lessonItems.length,
                resumeIdx,
                resumeLabel: lessonItems[resumeIdx]?.label,
                resumeStarted: completedCount > 0,
              }}
            />

            {!showHome && activeEntry && (
              <LessonHeadingBlock
                title={activeTitle}
                moduleTitle={activeEntry.moduleTitle}
                activeLessonId={activeLessonId}
                courseId={course.id}
                lessonStatusMap={lessonStatusMap}
              />
            )}

            {!showHome && course.instructor && (
              <InstructorBlock instructor={course.instructor} />
            )}

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

          {/* Sidebar curriculum: only in lesson mode. In home mode the
              main-column CourseHome renders the full curriculum, so showing
              the sidebar too would duplicate it. */}
          {!showHome && <CurriculumSidebar {...curriculum} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Lesson selection + history behaviour. Kept in this module (rather than the
 * course-learn component folder) because the navigation regression tests read
 * this file's source to assert that openLesson pushes instead of replacing and
 * that the ?item restore effect only moves activeIdx.
 */
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
    // Persist the opened lesson id in the URL (?item=<lessonId>) so that
    // returning from a quiz/interview sub-route — or refreshing — restores
    // this content view at the right lesson instead of bouncing back to the
    // course-home summary (Moodle-authentic resume behavior). Falls back to
    // the lesson index when the target id is missing.
    //
    // PUSHES a history entry (no `replace`). With replace:true the plain
    // /learn entry was overwritten, so Back from a lesson skipped the Learn
    // page entirely and landed on the course page.
    const openedId = lessonItems[idx]?.item.target?.id;
    void navigate({
      to: "/courses/$slug/learn",
      params: { slug },
      search: (prev) => ({ ...prev, item: openedId ?? String(idx) }),
    });
  }

  // Return to the course-home summary: clear ?item= and flip back to the home
  // view. Backs the clickable "Learn" breadcrumb crumb.
  //
  // Clearing ?item is all that's needed now that showHome is derived from the
  // URL — no local flag to keep in sync, so the async navigation can't race it.
  function goHome() {
    void navigate({
      to: "/courses/$slug/learn",
      params: { slug },
      search: (prev) => ({ ...prev, item: undefined }),
    });
  }

  // Restore / follow the ?item= param: when it changes (initial mount, browser
  // back from a quiz, or a deep-link) move activeIdx to the matching lesson and
  // leave the home view. Matches by lesson id first, then by numeric index
  // fallback. No-op when the param is absent so the home landing is preserved.
  useEffect(() => {
    if (!search.item || lessonItems.length === 0) return;
    let idx = lessonItems.findIndex((li) => li.item.target?.id === search.item);
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

  // ── DEV: lock overlay (commented out) ──
  // {lessonLocked ? (
  //   <GlassCard className="p-8">
  //     <div className="flex items-start gap-4">
  //       <Lock className="h-8 w-8 text-m3-outline shrink-0 mt-0.5" />
  //       <div className="flex-1 min-w-0">
  //         <p className="font-headline font-bold text-xl text-m3-on-surface mb-4">
  //           {t("course_learn.lesson_locked_title")}
  //         </p>
  //         <div className="flex flex-col gap-2 text-sm text-m3-on-surface-variant text-left">
  //           {unlockDetail?.prereqsMet === false && (
  //             <div className="flex items-start gap-2">
  //               <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
  //               <span>{t("course_learn.gate_prerequisites")}</span>
  //             </div>
  //           )}
  //           {unlockDetail && unlockDetail.efRatio && unlockDetail.totalCards > 0 && (
  //             <div className="flex items-start gap-2">
  //               {unlockDetail.efRatio.current >= unlockDetail.efRatio.required ? (
  //                 <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
  //               ) : (
  //                 <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
  //               )}
  //               <div>
  //                 <span>
  //                   {t("course_learn.gate_sr_ratio", {
  //                     passing: unlockDetail.passingCards,
  //                     total: unlockDetail.totalCards,
  //                     required: Math.round(unlockDetail.efRatio.required * 100),
  //                   })}
  //                 </span>
  //                 <div className="mt-1.5 w-full max-w-xs h-1.5 bg-m3-surface-variant rounded-full overflow-hidden">
  //                   <div
  //                     className="h-full rounded-full transition-all"
  //                     style={{
  //                       width: `${Math.min(100, (unlockDetail.efRatio.current / unlockDetail.efRatio.required) * 100)}%`,
  //                       backgroundColor: unlockDetail.efRatio.current >= unlockDetail.efRatio.required
  //                         ? "#4caf50"
  //                         : "#f97316",
  //                     }}
  //                   />
  //                 </div>
  //               </div>
  //             </div>
  //           )}
  //           {unlockDetail?.interviewReq && (
  //             <div className="flex items-start gap-2">
  //               {unlockDetail.interviewPassed ? (
  //                 <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
  //               ) : (
  //                 <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
  //               )}
  //               <span>{t("course_learn.gate_interview")}</span>
  //             </div>
  //           )}
  //           {unlockDetail?.estimate && (
  //             <p className="mt-3 pt-3 border-t border-m3-outline-variant text-m3-on-surface font-medium">
  //               {unlockDetail.estimate}
  //             </p>
  //           )}
  //         </div>
  //       </div>
  //     </div>
  //   </GlassCard>
  // ) : ...}
  // ───────────────────────────────────────
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
    <>
      <VideoEngagementTracker lesson={activeLesson} courseId={courseId} />
      <LessonPlayerFrame containerRef={playerRef} showPlayButton />
    </>
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

  useLessonEngagementTracker({
    materialVersionId,
    lessonId: lesson.id,
    courseId,
  });

  return (
    // space-y-6 here rather than relying on the parent: the pane now emits two
    // sibling sections (Reading + Knowledge map) and owns the gap between them.
    <div className="space-y-6">
      <GlassCard
        className="p-6 sm:p-8 space-y-6"
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

      {/* Teacher-published knowledge map — its own section, sibling to the
          Reading card rather than nested inside it: it describes the lesson's
          concepts, not the reading material, and burying it under the document
          made it read as part of that content. Renders nothing when no graph
          has been published for this lesson. */}
      <LessonKnowledgeMap lessonId={lesson.id} />
    </div>
  );
}
