import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Download,
  GraduationCap,
  Lock,
  SignalHigh,
} from "lucide-react";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Button } from "@/components/ui/button";
import { fetchCourseSyllabusDownloadUrl } from "@/lib/api/hooks/courses";
import type { CourseCareerPlacementPublic, CoursePublic, MyCourseProgressSummary } from "@/lib/api/types";
import type { TFunction } from "i18next";
import { cn } from "@/lib/utils";
import { formatEstimatedDuration } from "./helpers";

/**
 * Long descriptions clamp to 3 lines with a "Show more / Show less" toggle
 * (the card reads tidy; the toggle reveals the rest on demand).
 */
function CourseSummary({ description }: { description: string }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 4);
  }, [description]);

  return (
    <div>
      <p
        ref={ref}
        className={cn(
          "text-m3-on-surface-variant text-sm sm:text-base leading-relaxed w-full break-words",
          !expanded && "line-clamp-3",
        )}
      >
        {description}
      </p>
      {clamped && (
        <Button
          type="button"
          variant="link"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 h-auto p-0 text-xs font-semibold text-m3-primary underline underline-offset-2"
        >
          {expanded
            ? t("course_detail.show_less")
            : t("course_detail.show_more")}
        </Button>
      )}
    </div>
  );
}

/**
 * Right half of the CourseCard: the course image (or gradient placeholder),
 * padding 0. An ease blend (card-surface → transparent) fades the left edge
 * of the image into the card so the two halves melt together.
 */
function CourseCardImage({
  course,
  gradientClass,
}: {
  course: CoursePublic;
  gradientClass: string;
}) {
  return (
    <div className="relative min-h-[220px]">
      <div className={cn("absolute inset-0 bg-gradient-to-br", gradientClass)}>
        {course.thumbnail_url && (
          <img
            src={course.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {/* GraduationCap motif only on the gradient placeholder — a real
            thumbnail shouldn't have an icon overlaid on it. */}
        {!course.thumbnail_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
      </div>
      {/* Ease blend at the left side of the image into the card surface.
          Desktop only — removed on mobile (product feedback). */}
      <div className="hidden md:block absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-m3-surface-container-lowest via-m3-surface-container-lowest/30 to-transparent pointer-events-none" />
    </div>
  );
}

/**
 * The CTA button: enrolled students get Start/Continue (a link into the
 * learn page); unenrolled students get a locked, non-clickable state —
 * per BR they must not be able to start learning.
 */
function CourseCtaButton({
  slug,
  started,
  enrolled,
  enrollmentLoading,
}: {
  slug: string;
  started: boolean;
  enrolled: boolean;
  enrollmentLoading?: boolean;
}) {
  const { t } = useTranslation();

  if (enrolled) {
    return (
      <Link to="/courses/$slug/learn" params={{ slug }} className="block">
        <Button className="w-full gradient-primary text-white font-bold rounded-xl py-5 h-auto text-base gap-2 shadow-ai-glow hover:opacity-90 transition-opacity">
          {started
            ? t("course_detail.continue_learning")
            : t("course_detail.start_learning")}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        disabled
        className="w-full rounded-xl py-5 h-auto text-base gap-2 opacity-70 cursor-not-allowed bg-m3-surface-container-high text-m3-on-surface-variant"
        title={t("course_detail.enroll_required_body")}
      >
        <Lock className="h-5 w-5" />
        {t("course_detail.enroll_required")}
      </Button>
      {!enrollmentLoading && (
        <p className="text-[11px] text-m3-on-surface-variant leading-snug text-center px-2">
          {t("course_detail.enroll_required_hint")}
        </p>
      )}
    </div>
  );
}

/**
 * "Download syllabus" — the original PDF the course was built from.
 *
 * Only rendered when `course.has_syllabus`, which the backend sets from the
 * same publish-gated query the download endpoint uses, so a visible button
 * never leads to a 404. NOT enrolment-gated: the syllabus is what a student
 * reads to decide whether to enrol.
 *
 * The URL is minted on click rather than with the page: it is a short-TTL
 * presigned link, so one fetched at render time could already be dead by the
 * time anyone clicks. Opened in a new tab instead of navigating, so the
 * student does not lose the course page.
 */
function CourseSyllabusButton({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function download() {
    setBusy(true);
    setFailed(false);
    try {
      const url = await fetchCourseSyllabusDownloadUrl(courseId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // A storage blip or an expired session is the realistic cause. Say so
      // inline rather than opening a blank tab with nothing in it.
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 rounded-xl"
        onClick={() => void download()}
        disabled={busy}
      >
        <Download className="h-4 w-4" />
        {busy
          ? t("course_detail.syllabus_downloading")
          : t("course_detail.download_syllabus")}
      </Button>
      {failed && (
        <p className="text-[11px] leading-snug text-danger">
          {t("course_detail.syllabus_download_failed")}
        </p>
      )}
    </div>
  );
}

/**
 * Meta line: expected learning hours · difficulty · number of modules.
 * Segments hide themselves when the course lacks the data.
 */
function CourseMeta({
  duration,
  level,
  moduleCount,
}: {
  duration: string | null;
  level: string | null;
  moduleCount: number;
}) {
  const { t } = useTranslation();
  if (!duration && !level && moduleCount <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-5 text-sm text-m3-on-surface-variant">
      {duration && (
        <span className="flex items-center gap-1.5" title={duration}>
          <Clock className="h-4 w-4 text-m3-outline" />
          <span className="font-semibold text-m3-on-surface">{duration}</span>
        </span>
      )}
      {level && (
        <span className="flex items-center gap-1.5">
          <SignalHigh className="h-4 w-4 text-m3-outline" />
          <span className="font-semibold text-m3-on-surface">{level}</span>
        </span>
      )}
      {moduleCount > 0 && (
        <span className="flex items-center gap-1.5" title={t("course_detail.modules")}>
          <BookOpen className="h-4 w-4 text-m3-outline" />
          <span className="font-semibold text-m3-on-surface">{moduleCount}</span>
        </span>
      )}
    </div>
  );
}

/** Overall progress — label, bar, percentage (enrolled students only). */
function CourseProgress({
  enrolled,
  started,
  percent,
  loading,
}: {
  enrolled: boolean;
  started: boolean;
  percent: number;
  loading?: boolean;
}) {
  const { t } = useTranslation();

  if (enrolled && started) {
    return (
      <div className="space-y-1.5">
        <div className="h-2 rounded-full bg-m3-surface-container-high overflow-hidden">
          <div
            className="h-full gradient-primary rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-m3-on-surface-variant">
            {t("course_detail.progress_label")}
          </span>
          <span className="font-bold text-m3-primary">{percent}%</span>
        </div>
      </div>
    );
  }

  if (enrolled && loading) {
    return (
      <div className="h-2 rounded-full bg-m3-surface-container-high animate-pulse" />
    );
  }

  return null;
}

/**
 * Full-width landing card, split 50/50:
 *
 * - Left (p-4): AI-enhanced badge (one icon), course name, summary with
 *   Show more/Show less, expected-hours / difficulty / module-count meta,
 *   the Start/Continue button and the overall progress bar + percentage.
 * - Right: the course image with padding 0 and an ease blend at its left
 *   edge into the card.
 *
 * ``progress`` is the enrolled student's course summary; absent for
 * anonymous / unenrolled visitors. Per BR, an unenrolled student must not
 * be able to start learning: the CTA becomes a locked, non-clickable
 * "enrollment required" state instead of a link into the learn page.
 */

/**
 * Derived course level from career-path placement (user decision 2026-08-18):
 * the level is no longer user-set — it's the course's stage on its path,
 * shown as "Stage N — <title>". Uses the FIRST placement; "+ n more" when the
 * course also sits on other paths. Null when the course is on no path.
 */
function courseStageLabel(
  careerPaths: CourseCareerPlacementPublic[] | undefined,
  t: TFunction,
): string | null {
  const primary = (careerPaths ?? [])[0];
  if (!primary) return null;
  // The stage title is the natural label; fall back to the career-path name
  // (e.g. "IT Senior") when the stage itself has no title, and to a bare
  // "Stage N" only when both are absent.
  const title = primary.stage_title || primary.career_path_name;
  const base = title
    ? t("course_detail.stage_label", { n: primary.stage_position, title })
    : t("course_detail.stage_label_short", { n: primary.stage_position });
  const extra = (careerPaths?.length ?? 0) > 1 ? ` ${t("course_detail.more_paths", { count: (careerPaths?.length ?? 0) - 1 })}` : "";
  return base + extra;
}

export function CourseCard({
  course,
  gradientClass,
  moduleCount,
  progress,
  progressLoading,
  enrolled,
  enrollmentLoading,
}: {
  course: CoursePublic;
  gradientClass: string;
  moduleCount: number;
  progress?: MyCourseProgressSummary;
  progressLoading?: boolean;
  enrolled: boolean;
  enrollmentLoading?: boolean;
}) {
  const { t } = useTranslation();

  const started = Boolean(
    progress &&
      progress.lessons.some((l) => l.status !== "not_started"),
  );
  const percent = progress
    ? Math.round(Number(progress.completion_percent))
    : 0;
  const duration = formatEstimatedDuration(course.estimated_minutes);
  const level = courseStageLabel(course.career_paths, t);

  return (
    <div className="rounded-xl overflow-hidden shadow-editorial ghost-border bg-m3-surface-container-lowest">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left half: p-6 (24px). */}
        <div className="p-6 flex flex-col justify-center gap-4 min-w-0">
          {/* Top-left badge — AI-enhanced, single icon (Sparkles). */}
          <div>
            <AIInsightChip className="bg-m3-primary/10 text-m3-primary border-0">
              {t("course_detail.ai_enhanced")}
            </AIInsightChip>
          </div>

          <h1 className="font-headline font-extrabold text-2xl sm:text-3xl lg:text-4xl text-m3-on-surface leading-tight tracking-tight">
            {course.title}
          </h1>

          {course.description && (
            <CourseSummary description={course.description} />
          )}

          <CourseMeta
            duration={duration}
            level={level}
            moduleCount={moduleCount}
          />

          <CourseCtaButton
            slug={course.slug}
            started={started}
            enrolled={enrolled}
            enrollmentLoading={enrollmentLoading}
          />

          {course.has_syllabus ? (
            <CourseSyllabusButton courseId={course.id} />
          ) : null}

          <CourseProgress
            enrolled={enrolled}
            started={started}
            percent={percent}
            loading={progressLoading}
          />
        </div>

        {/* Right half: image, padding 0. */}
        <CourseCardImage course={course} gradientClass={gradientClass} />
      </div>
    </div>
  );
}
