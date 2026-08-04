import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Clock,
  GraduationCap,
  SignalHigh,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarInitials,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { CoursePublic, MyCourseProgressSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatEstimatedDuration } from "./helpers";

/** Thumbnail (or gradient placeholder) at the top of the CTA card. */
function CtaThumbnail({
  course,
  gradientClass,
}: {
  course: CoursePublic;
  gradientClass: string;
}) {
  return (
    <div className={cn("relative h-44 bg-gradient-to-br", gradientClass)}>
      {course.thumbnail_url && (
        <img
          src={course.thumbnail_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
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
  );
}

/** Instructor row at the foot of the CTA card. */
function CtaInstructorRow({
  instructor,
}: {
  instructor: NonNullable<CoursePublic["instructor"]>;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 pt-2 border-t border-m3-outline-variant/20">
      <Avatar className="h-9 w-9 shrink-0">
        {instructor.avatar_url ? (
          <AvatarImage
            src={instructor.avatar_url}
            alt={instructor.display_name}
          />
        ) : null}
        <AvatarFallback className="gradient-primary text-white text-xs font-bold">
          {avatarInitials(instructor.display_name, {
            uppercase: true,
          })}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-m3-on-surface truncate">
          {instructor.display_name}
        </p>
        <p className="text-[10px] text-m3-on-surface-variant">
          {t("course_detail.instructor_role")}
        </p>
      </div>
    </div>
  );
}

/**
 * Start/continue card on the sticky right rail: thumbnail, CTA button,
 * progress bar (enrolled students only), meta rows and the instructor.
 *
 * ``progress`` is the enrolled student's course summary; absent for
 * anonymous / unenrolled visitors, in which case the card shows the plain
 * "Start learning" affordance with no progress.
 */
export function CtaCard({
  course,
  gradientClass,
  moduleCount,
  progress,
  progressLoading,
}: {
  course: CoursePublic;
  gradientClass: string;
  moduleCount: number;
  progress?: MyCourseProgressSummary;
  progressLoading?: boolean;
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
  const level = course.level ? t(`course_detail.level_${course.level}`) : null;

  return (
    <div className="rounded-xl overflow-hidden shadow-editorial ghost-border bg-m3-surface-container-lowest">
      <CtaThumbnail course={course} gradientClass={gradientClass} />

      <div className="p-5 space-y-5">
        <Link
          to="/courses/$slug/learn"
          params={{ slug: course.slug }}
          className="block"
        >
          <Button className="w-full gradient-primary text-white font-bold rounded-xl py-5 h-auto text-base gap-2 shadow-ai-glow hover:opacity-90 transition-opacity">
            {started
              ? t("course_detail.continue_learning")
              : t("course_detail.start_learning")}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>

        {/* Progress — only once the student has actually started. */}
        {started && (
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
        )}

        {progressLoading && !progress && (
          <div className="h-2 rounded-full bg-m3-surface-container-high animate-pulse" />
        )}

        {moduleCount > 0 && (
          <div className="flex items-center justify-between text-sm pt-1">
            <span className="flex items-center gap-2 text-m3-on-surface-variant">
              <BookOpen className="h-4 w-4 text-m3-outline" />
              {t("course_detail.modules")}
            </span>
            <span className="font-semibold text-m3-on-surface text-xs">
              {moduleCount}
            </span>
          </div>
        )}

        {(duration || level) && (
          <div className="flex items-center gap-4 text-sm text-m3-on-surface-variant pt-1">
            {duration && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-m3-outline" />
                {duration}
              </span>
            )}
            {level && (
              <span className="flex items-center gap-1.5">
                <SignalHigh className="h-4 w-4 text-m3-outline" />
                {level}
              </span>
            )}
          </div>
        )}

        {course.instructor && (
          <CtaInstructorRow instructor={course.instructor} />
        )}
      </div>
    </div>
  );
}
