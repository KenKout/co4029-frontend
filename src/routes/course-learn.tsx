import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useParams, useSearch, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQueries } from "@tanstack/react-query";
import {
  Play,
  Check,
  CheckCircle2,
  PlayCircle,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mic,
  ArrowRight,
  FileText,
  Maximize2,
  Download,
  Sparkles,
  HelpCircle,
  XCircle,
  // Lock,
} from "lucide-react";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApiError, apiFetch } from "@/lib/api/client";
import {
  useCourseBySlug,
  useCourseContent,
  useLesson,
  useLessonResources,
  useResourceDownloadUrl,
} from "@/lib/api/hooks/courses";
import { useStreamUrl } from "@/lib/api/hooks/materials";
import { useMyCourseProgress, useMarkLessonComplete, useUnmarkLessonComplete } from "@/lib/api/hooks/progress";
// import { useCourseSrOverview } from "@/lib/api/hooks/spaced-repetition";
import { useLessonEngagementTracker } from "@/lib/hooks/useLessonEngagementTracker";
import ReactMarkdown from "react-markdown";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  InstructorRead,
  LessonPublic,
  LessonResourcePublic,
  ModuleItemPublic,
  ModulePublic,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

// type LessonState = "active" | "completed" | "pending" | "locked";
type LessonState = "active" | "completed" | "pending";

interface FlatItem {
  moduleId: string;
  moduleTitle: string;
  item: ModuleItemPublic;
  label: string;
}

const TABS = ["Lesson Notes", "Discussion", "Resources"] as const;
type Tab = (typeof TABS)[number];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function buildFlatItems(
  modules: ModulePublic[],
  itemsByModule: Record<string, ModuleItemPublic[] | undefined>,
  lessonFallback: string,
  quizLabel: string,
  interviewLabel: string,
): FlatItem[] {
  const sortedModules = [...modules].sort((a, b) => a.position - b.position);
  return sortedModules.flatMap((mod) => {
    const items = itemsByModule[mod.id] ?? [];
    return [...items]
      .sort((a, b) => a.position - b.position)
      .map<FlatItem>((item) => ({
        moduleId: mod.id,
        moduleTitle: mod.title,
        item,
        // Prefer the concrete title (e.g. "Ngan's Interview", "Chapter 1 Quiz")
        // carried on item.target for every item type; fall back to the generic
        // type label only when the target has no title (e.g. a draft the reader
        // slimmed out).
        label:
          item.target?.title ??
          (item.item_type === "quiz"
            ? quizLabel
            : item.item_type === "interview"
              ? interviewLabel
              : lessonFallback),
      }));
  });
}

export default function CourseLearnPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };

  const courseQuery = useCourseBySlug(slug);
  const course = courseQuery.data;
  const courseId = course?.id;
  const { data: content, isLoading: contentLoading } = useCourseContent(courseId);

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
              {t("course_detail.browse_courses")} <ArrowRight className="h-4 w-4" />
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

  const flatItems = useMemo(
    () =>
      buildFlatItems(
        sortedModules,
        itemsByModule,
        t("teacher_common.lesson_fallback"),
        t("teacher_common.quiz_label"),
        t("teacher_common.interview_label"),
      ),
    [sortedModules, itemsByModule, t],
  );

  const lessonItems = useMemo(
    () => flatItems.filter((fi) => fi.item.item_type === "lesson" && fi.item.target),
    [flatItems],
  );

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

  // Fallback: use sidebar metadata when API returns lesson_locked 403
  const activeEntry = lessonItems[activeIdx] ?? null;
  const activeLessonId = activeEntry?.item.target?.id;
  const lessonQuery = useLesson(activeLessonId);
  const activeLesson =
    lessonQuery.data ??
    (activeEntry?.item.target?.id && activeEntry?.item.target
      ? (activeEntry.item.target as LessonPublic)
      : null);
  const lessonUnavailable =
    lessonQuery.isError &&
    lessonQuery.error instanceof ApiError &&
    lessonQuery.error.status === 404;

  const lessonIdForResources = activeTab === "Resources" ? (activeLessonId ?? undefined) : undefined;
  const { data: resources } = useLessonResources(lessonIdForResources);

  const courseProgressQuery = useMyCourseProgress(course.id);
  const lessonStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of courseProgressQuery.data?.lessons ?? []) {
      map.set(row.lesson_id, row.status);
    }
    return map;
  }, [courseProgressQuery.data]);

  const search = useSearch({ strict: false }) as { t?: string | number; p?: string | number };
  const { hash } = useLocation();
  const playerRef = useRef<HTMLDivElement | null>(null);

  const seekSeconds = useMemo(() => {
    if (search.t === undefined || search.t === null) return null;
    const n = Number(search.t);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [search.t]);

  const targetPage = useMemo(() => {
    if (search.p === undefined || search.p === null) return null;
    const n = Number(search.p);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
  }, [search.p]);

  const targetAnchor = useMemo(() => (hash ? hash.replace(/^#/, "") : null), [hash]);

  useEffect(() => {
    const container = playerRef.current;
    if (!container) return;

    if (seekSeconds !== null) {
      const media = container.querySelector<HTMLMediaElement>("video, audio");
      if (media) {
        const apply = () => {
          try {
            media.currentTime = seekSeconds;
          } catch {
            // ignore — seek before metadata loaded
          }
        };
        if (media.readyState >= 1) apply();
        else media.addEventListener("loadedmetadata", apply, { once: true });
      }
    }

    if (targetPage !== null) {
      const iframe = container.querySelector<HTMLIFrameElement>("iframe");
      if (iframe) {
        try {
          const u = new URL(iframe.src, window.location.origin);
          u.hash = `page=${targetPage}`;
          if (iframe.src !== u.toString()) iframe.src = u.toString();
        } catch {
          // ignore — non-URL src
        }
        iframe.dataset.page = String(targetPage);
      }
    }

    if (targetAnchor) {
      const el = container.querySelector(`#${CSS.escape(targetAnchor)}`);
      if (el && "scrollIntoView" in el) {
        (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [activeLessonId, seekSeconds, targetPage, targetAnchor]);

  const hasPrev = activeIdx > 0;
  const hasNext = activeIdx < lessonItems.length - 1;

  function goPrev() { if (hasPrev) setActiveIdx(activeIdx - 1); }
  function goNext() { if (hasNext) setActiveIdx(activeIdx + 1); }

  function itemState(fi: FlatItem): LessonState {
    if (fi.item.item_type === "lesson" && fi.item.target?.id === activeLessonId) {
      return "active";
    }
    if (fi.item.item_type === "lesson" && fi.item.target?.id) {
      const id = fi.item.target.id;
      // if (lockedLessonIds.has(id)) return "locked"; // DEV: comment out to disable lock
      if (lessonStatusMap.get(id) === "completed") return "completed";
    }
    return "pending";
  }

  if (!lessonItems.length) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-m3-on-surface font-headline font-bold text-xl">No lessons available yet</p>
          <p className="text-sm text-m3-on-surface-variant">
            This course does not have any lesson content ready for students yet.
          </p>
          <Link to="/courses/$slug" params={{ slug }}>
            <Button className="gradient-primary text-white rounded-xl gap-2">
              Back to Course <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <nav className="flex items-center gap-2 text-xs text-m3-on-surface-variant mb-5">
          <Link to="/courses" className="hover:text-m3-primary transition-colors">
            Courses
          </Link>
          <span>/</span>
          <Link to="/courses/$slug" params={{ slug }} className="hover:text-m3-primary transition-colors truncate max-w-[160px]">
            {course.title}
          </Link>
          <span>/</span>
          <span className="text-m3-on-surface font-medium truncate">Learn</span>
        </nav>

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

            {/* ── DEV: lock overlay (commented out) ──
            {lessonLocked ? (
              <GlassCard className="p-8">
                <div className="flex items-start gap-4">
                  <Lock className="h-8 w-8 text-m3-outline shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-bold text-xl text-m3-on-surface mb-4">
                      {t("course_learn.lesson_locked_title")}
                    </p>
                    <div className="flex flex-col gap-2 text-sm text-m3-on-surface-variant text-left">
                      {unlockDetail?.prereqsMet === false && (
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <span>{t("course_learn.gate_prerequisites")}</span>
                        </div>
                      )}
                      {unlockDetail && unlockDetail.efRatio && unlockDetail.totalCards > 0 && (
                        <div className="flex items-start gap-2">
                          {unlockDetail.efRatio.current >= unlockDetail.efRatio.required ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span>
                              {t("course_learn.gate_sr_ratio", {
                                passing: unlockDetail.passingCards,
                                total: unlockDetail.totalCards,
                                required: Math.round(unlockDetail.efRatio.required * 100),
                              })}
                            </span>
                            <div className="mt-1.5 w-full max-w-xs h-1.5 bg-m3-surface-variant rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, (unlockDetail.efRatio.current / unlockDetail.efRatio.required) * 100)}%`,
                                  backgroundColor: unlockDetail.efRatio.current >= unlockDetail.efRatio.required
                                    ? "#4caf50"
                                    : "#f97316",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {unlockDetail?.interviewReq && (
                        <div className="flex items-start gap-2">
                          {unlockDetail.interviewPassed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          )}
                          <span>{t("course_learn.gate_interview")}</span>
                        </div>
                      )}
                      {unlockDetail?.estimate && (
                        <p className="mt-3 pt-3 border-t border-m3-outline-variant text-m3-on-surface font-medium">
                          {unlockDetail.estimate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ) : */}
            {lessonUnavailable ? (
              <GlassCard className="p-10 text-center">
                <p className="font-headline font-bold text-xl text-m3-on-surface mb-2">
                  {t("course_learn.lesson_unavailable_title")}
                </p>
                <p className="text-sm text-m3-on-surface-variant">
                  {t("course_learn.lesson_unavailable_body")}
                </p>
              </GlassCard>
            ) : activeLesson?.lesson_type === "reading" ? (
              <ReadingLessonPane
                lesson={activeLesson}
                courseId={course.id}
              />
            ) : activeLesson ? (
              <>
                <VideoEngagementTracker
                  lesson={activeLesson}
                  courseId={course.id}
                />
                <div
                  ref={playerRef}
                  className="rounded-xl overflow-hidden bg-black shadow-2xl"
                  data-testid="course-learn-player"
                >
                  <div className="relative aspect-video">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-900 to-slate-900 opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-m3-primary/90 text-white rounded-full flex items-center justify-center shadow-2xl">
                        <Play className="h-9 w-9 fill-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div
                ref={playerRef}
                className="rounded-xl overflow-hidden bg-black shadow-2xl"
                data-testid="course-learn-player"
              >
                <div className="relative aspect-video">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-900 to-slate-900 opacity-80" />
                </div>
              </div>
            )}

            {activeEntry && (
              <div className="space-y-3">
                <h1 className="font-headline font-extrabold text-3xl sm:text-4xl text-m3-primary tracking-tight leading-none">
                  {activeLesson?.title ?? activeEntry.label}
                </h1>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-m3-on-surface-variant">{activeEntry.moduleTitle}</span>
                  {activeLessonId && (
                    <MarkCompleteButton
                      lessonId={activeLessonId}
                      courseId={course.id}
                      isCompleted={
                        lessonStatusMap.get(activeLessonId) === "completed"
                      }
                    />
                  )}
                </div>
              </div>
            )}

            {course.instructor && (
              <InstructorBlock instructor={course.instructor} />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-m3-outline-variant/20">
              <div className="flex gap-1 flex-wrap">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200",
                      activeTab === tab
                        ? "bg-m3-secondary text-white shadow-ai-glow"
                        : "text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-surface-container"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl ghost-border text-xs font-bold"
                  onClick={goPrev}
                  disabled={!hasPrev}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {hasPrev ? (
                    <span className="max-w-[120px] truncate">{lessonItems[activeIdx - 1]?.label}</span>
                  ) : (
                    "Previous"
                  )}
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl gradient-primary text-white text-xs font-bold flex items-center gap-1.5"
                  onClick={goNext}
                  disabled={!hasNext}
                >
                  {hasNext ? (
                    <span className="max-w-[120px] truncate">Next: {lessonItems[activeIdx + 1]?.label}</span>
                  ) : (
                    "Finished"
                  )}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="pb-4">
              {activeTab === "Lesson Notes" && (
                <GlassCard className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-m3-secondary" />
                    <h4 className="font-headline font-bold text-m3-on-surface text-sm">Lesson Notes</h4>
                  </div>
                  <p className="text-m3-on-surface-variant text-sm leading-relaxed">
                    Lesson notes will appear here once the material is processed.
                  </p>
                </GlassCard>
              )}

              {activeTab === "Discussion" && (
                <GlassCard className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-5">
                    <HelpCircle className="h-4 w-4 text-m3-secondary" />
                    <h4 className="font-headline font-bold text-m3-on-surface text-sm">Discussion</h4>
                  </div>
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <p className="text-sm font-semibold text-m3-on-surface">Discussion coming soon</p>
                    <p className="text-xs text-m3-on-surface-variant">
                      Lesson-level discussion threads are under development.
                    </p>
                  </div>
                </GlassCard>
              )}

              {activeTab === "Resources" && (
                <ResourcesPanel resources={resources} />
              )}
            </div>
          </div>

          <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 flex flex-col gap-4">
            <GlassCard className="flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-m3-outline-variant/20 bg-m3-primary/5">
                <h3 className="font-headline font-bold text-m3-primary text-sm">Curriculum</h3>
              </div>
              <div className="overflow-y-auto max-h-[520px] p-3 space-y-4">
                {sortedModules.map((mod) => (
                  <ModuleSection
                    key={mod.id}
                    mod={mod}
                    flatItems={flatItems}
                    lessonItems={lessonItems}
                    itemState={itemState}
                    onSelect={(idx) => setActiveIdx(idx)}
                    slug={slug}
                    isActiveModule={activeEntry?.moduleId === mod.id}
                  />
                ))}
              </div>
            </GlassCard>
          </aside>
        </div>
      </div>
    </div>
  );
}

function useModuleItemsMap(modules: ModulePublic[]): Record<string, ModuleItemPublic[] | undefined> {
  const moduleIds = useMemo(
    () => modules.map((m) => m.id),
    [modules],
  );

  const results = useQueries({
    queries: moduleIds.map((moduleId) => ({
      queryKey: queryKeys.courses.moduleItems(moduleId),
      queryFn: () => apiFetch<ModuleItemPublic[]>(`/modules/${moduleId}/items`),
      enabled: !!moduleId,
    })),
  });

  return useMemo(() => {
    const next: Record<string, ModuleItemPublic[] | undefined> = {};
    moduleIds.forEach((id, idx) => {
      next[id] = results[idx]?.data;
    });
    return next;
  }, [moduleIds, results]);
}

function MarkCompleteButton({
  lessonId,
  courseId,
  isCompleted,
}: {
  lessonId: string;
  courseId: string;
  isCompleted: boolean;
}) {
  const { t } = useTranslation();
  const markMut = useMarkLessonComplete({ lessonId, courseId });
  const unmarkMut = useUnmarkLessonComplete({ lessonId, courseId });
  const pending = markMut.isPending || unmarkMut.isPending;

  function handleClick() {
    if (isCompleted) unmarkMut.mutate(lessonId);
    else markMut.mutate(lessonId);
  }

  return (
    <Button
      size="sm"
      variant={isCompleted ? "outline" : "default"}
      disabled={pending}
      onClick={handleClick}
      className={cn(
        "rounded-xl gap-2 text-xs font-bold",
        isCompleted
          ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
          : "gradient-primary text-white hover:opacity-95",
      )}
    >
      {isCompleted ? (
        <>
          <CheckCircle2 className="h-4 w-4 fill-emerald-100" />
          {t("course_learn.mark_complete.completed")}
        </>
      ) : (
        <>
          <Check className="h-4 w-4" />
          {t("course_learn.mark_complete.mark_done")}
        </>
      )}
    </Button>
  );
}

function VideoEngagementTracker({
  lesson,
  courseId,
}: {
  lesson: LessonPublic;
  courseId: string;
}) {
  // Video lessons share the same primary_material_id pattern as reading
  // lessons; we resolve the version via the same stream-url endpoint and
  // emit engagement on the same heartbeat schedule. The actual <video>
  // playback events (play/pause/timeupdate) would refine this, but the
  // current course-learn pane is a placeholder, so a presence-based
  // heartbeat is the most we can faithfully report.
  const materialId = lesson.primary_material_id ?? null;
  const streamQuery = useStreamUrl(materialId);
  const materialVersionId = streamQuery.data?.material_version_id ?? null;

  useLessonEngagementTracker({
    materialVersionId,
    lessonId: lesson.id,
    courseId,
  });

  return null;
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

  const hasNotes = Boolean(lesson.notes_markdown && lesson.notes_markdown.trim().length > 0);
  const hasMaterial = Boolean(materialId);

  const openFullscreen = () => {
    if (streamUrl) {
      window.open(streamUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <GlassCard className="p-6 sm:p-8 space-y-6" data-testid="course-learn-reading">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-m3-secondary" />
          <span className="text-xs font-headline font-semibold uppercase tracking-wider text-m3-on-surface-variant">
            {t("course_learn.reading_lesson")}
          </span>
        </div>
        {streamUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={openFullscreen}
            className="rounded-xl text-xs font-bold gap-1.5 text-m3-on-surface-variant hover:text-m3-primary"
            data-testid="course-learn-reading-fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            {t("course_learn.reading_open_fullscreen")}
          </Button>
        )}
      </div>

      {lesson.summary && (
        <p className="text-sm text-m3-on-surface-variant leading-relaxed">
          {lesson.summary}
        </p>
      )}

      {hasMaterial && (
        streamQuery.isLoading ? (
          <div className="h-[600px] rounded-xl bg-m3-surface-container-low animate-pulse" />
        ) : streamUrl ? (
          <div className="mt-2 rounded-xl overflow-hidden border border-m3-outline-variant/30">
            <iframe
              src={streamUrl}
              title={lesson.title}
              className="w-full h-[600px] bg-white"
              data-testid="course-learn-reading-iframe"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-m3-outline-variant/40 p-6 text-sm text-m3-on-surface-variant">
            {t("course_learn.reading_material_unavailable")}
          </div>
        )
      )}

      {hasNotes && (
        <article className="prose prose-sm max-w-none prose-headings:font-headline prose-headings:text-m3-on-surface prose-p:text-m3-on-surface-variant prose-a:text-m3-primary">
          <ReactMarkdown>{lesson.notes_markdown ?? ""}</ReactMarkdown>
        </article>
      )}

      {!hasMaterial && !hasNotes && (
        <p className="text-sm text-m3-on-surface-variant">
          {t("course_learn.reading_empty")}
        </p>
      )}
    </GlassCard>
  );
}

function ResourcesPanel({ resources }: { resources: LessonResourcePublic[] | undefined }) {
  return (
    <GlassCard className="p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        <Download className="h-4 w-4 text-m3-secondary" />
        <h4 className="font-headline font-bold text-m3-on-surface text-sm">
          Downloadable Resources
        </h4>
        {resources && (
          <span className="ml-auto text-xs text-m3-on-surface-variant">
            {resources.length} file{resources.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!resources ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-m3-surface-container animate-pulse" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-m3-surface-container flex items-center justify-center">
            <FileText className="h-5 w-5 text-m3-outline" />
          </div>
          <p className="text-sm font-semibold text-m3-on-surface">No resources for this lesson</p>
        </div>
      ) : (
        resources.map((file) => <ResourceRow key={file.id} resource={file} />)
      )}
    </GlassCard>
  );
}

function ResourceRow({ resource }: { resource: LessonResourcePublic }) {
  const { t } = useTranslation();
  const [requested, setRequested] = useState(false);
  const downloadQuery = useResourceDownloadUrl(requested ? resource.id : undefined);
  const downloadUnavailable =
    downloadQuery.isError &&
    downloadQuery.error instanceof ApiError &&
    downloadQuery.error.status === 404;

  useEffect(() => {
    if (downloadQuery.data?.url && requested) {
      window.open(downloadQuery.data.url, "_blank", "noopener,noreferrer");
      setRequested(false);
    }
  }, [downloadQuery.data, requested]);

  return (
    <div className="flex items-center gap-3 py-3 border-b border-m3-outline-variant/15 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-m3-secondary/10 flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4 text-m3-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">{resource.title}</p>
        <p className="text-[10px] text-m3-outline uppercase">{resource.resource_type}</p>
        {downloadUnavailable && (
          <p className="text-[10px] text-amber-600 mt-0.5">{t("course_learn.resource_unavailable")}</p>
        )}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-xl text-m3-secondary hover:bg-m3-secondary/10"
        title={downloadUnavailable ? t("course_learn.resource_unavailable") : t("course_learn.download")}
        onClick={() => setRequested(true)}
        disabled={downloadQuery.isFetching}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}

function InstructorBlock({ instructor }: { instructor: InstructorRead }) {
  return (
    <div className="glass ghost-border rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
      <Avatar className="h-20 w-20 shrink-0 ring-4 ring-white shadow-xl">
        {instructor.avatar_url ? (
          <AvatarImage src={instructor.avatar_url} alt={instructor.display_name} />
        ) : null}
        <AvatarFallback className="gradient-primary text-white text-xl font-bold font-headline">
          {initials(instructor.display_name)}
        </AvatarFallback>
      </Avatar>
      <div className="text-center sm:text-left">
        <h3 className="text-lg font-headline font-bold text-m3-primary">
          {instructor.display_name}
        </h3>
        <p className="text-m3-secondary font-semibold text-xs mt-0.5 mb-2">Instructor</p>
        {instructor.headline && (
          <p className="text-m3-on-surface-variant text-sm leading-relaxed">
            {instructor.headline}
          </p>
        )}
      </div>
    </div>
  );
}

function ModuleSection({
  mod,
  flatItems,
  lessonItems,
  itemState,
  onSelect,
  slug,
  isActiveModule,
}: {
  mod: ModulePublic;
  flatItems: FlatItem[];
  lessonItems: FlatItem[];
  itemState: (fi: FlatItem) => LessonState;
  onSelect: (idx: number) => void;
  slug: string;
  isActiveModule: boolean;
}) {
  const modItems = flatItems
    .map((fi) => ({ fi, idx: lessonItems.findIndex((lesson) => lesson.item.id === fi.item.id) }))
    .filter(({ fi }) => fi.moduleId === mod.id);

  const [open, setOpen] = useState(isActiveModule);

  // Keep the module containing the active lesson expanded even if the
  // student navigates between modules without manually re-opening it.
  useEffect(() => {
    if (isActiveModule) setOpen(true);
  }, [isActiveModule]);

  if (!modItems.length) return null;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-m3-primary/5 group cursor-pointer"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 text-m3-outline shrink-0 transition-transform duration-300 group-hover:text-m3-primary",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
        <span className="text-[10px] font-bold text-m3-outline uppercase tracking-tight transition-colors group-hover:text-m3-primary">
          {mod.title}
        </span>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden min-h-0 space-y-1">
      {modItems.map(({ fi, idx }) => {
        const state = itemState(fi);
        const isQuiz = fi.item.item_type === "quiz";
        const isInterview = fi.item.item_type === "interview";
        const LessonIcon = PlayCircle;
        const quizId = isQuiz ? fi.item.target?.id : null;

        const className = cn(
          "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 text-sm",
          state === "active" && "bg-m3-primary text-white shadow-md font-bold",
          state === "completed" && "bg-m3-surface-container-lowest text-m3-primary shadow-sm font-medium hover:bg-m3-surface-container",
          state === "pending" && "text-m3-on-surface-variant hover:bg-white/50 font-medium",
          // state === "locked" && "opacity-40 cursor-not-allowed text-m3-outline", // DEV: comment out to disable lock
        );

        const inner = (
          <>
            {state === "completed" && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500 fill-emerald-100" />}
            {/* {state === "locked" && <Lock className="h-4 w-4 flex-shrink-0" />} */}{/* DEV: comment out to disable lock */}
            {state === "active" && <LessonIcon className="h-4 w-4 flex-shrink-0" />}
            {state === "pending" && !isQuiz && !isInterview && <LessonIcon className="h-4 w-4 flex-shrink-0 opacity-40" />}
            {state === "pending" && isQuiz && <HelpCircle className="h-4 w-4 flex-shrink-0 opacity-60" />}
            {isInterview && <Mic className="h-4 w-4 flex-shrink-0" />}
            {isQuiz && state !== "active" && <Sparkles className="h-3 w-3 ml-auto text-m3-secondary" />}

            <span className="truncate leading-snug flex-1">{fi.label}</span>
            <BookOpen className="h-3 w-3 opacity-0" />
          </>
        );

        if (isQuiz && quizId) {
          return (
            <Link
              key={fi.item.id}
              to="/courses/$slug/quiz/$quizId"
              params={{ slug, quizId }}
              className={className}
            >
              {inner}
            </Link>
          );
        }

        if (isInterview && fi.item.target?.id) {
          return (
            <Link
              key={fi.item.id}
              to="/courses/$slug/interview/$moduleId"
              params={{ slug, moduleId: fi.item.target.id }}
              className={className}
            >
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={fi.item.id}
            onClick={() => idx >= 0 && onSelect(idx)}
            disabled={idx < 0 /* || state === "locked" */} // DEV: uncomment state check to re-enable lock
            className={className}
          >
            {inner}
          </button>
        );
      })}
        </div>
      </div>
    </div>
  );
}
