import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, GraduationCap } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarInitials,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { CoursePublic, TagPublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";

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

/** Start-learning card: thumbnail, CTA, module count, tags, instructor. */
export function CtaCard({
  course,
  gradientClass,
  moduleCount,
  tags,
}: {
  course: CoursePublic;
  gradientClass: string;
  moduleCount: number;
  tags: TagPublic[] | undefined;
}) {
  const { t } = useTranslation();
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
            {t("course_detail.start_learning")}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>

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

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-m3-outline-variant/20">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2.5 py-1 rounded-full bg-m3-secondary/8 text-m3-secondary text-[10px] font-semibold"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {course.instructor && (
          <CtaInstructorRow instructor={course.instructor} />
        )}
      </div>
    </div>
  );
}
