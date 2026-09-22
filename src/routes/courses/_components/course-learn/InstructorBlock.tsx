import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarInitials,
} from "@/components/ui/avatar";
import type { CoursePublic, InstructorRead } from "@/lib/api/types";
import { UsersRound } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export function resolveCourseInstructors(
  course: CoursePublic,
): InstructorRead[] {
  if (course.instructors?.length) return course.instructors;
  if (!course.instructor) return [];
  return [{ ...course.instructor, is_instructor: true, is_assistant: false }];
}

export function InstructorBlock({
  instructors,
}: {
  instructors: InstructorRead[];
}) {
  const { t } = useTranslation();
  return (
    <GlassCard className="min-w-0">
      <div className="flex items-center gap-2 border-b border-m3-outline-variant/20 px-4 py-3">
        <UsersRound className="h-4 w-4 shrink-0 text-m3-secondary" />
        <h3 className="min-w-0 font-headline text-sm font-bold text-m3-on-surface">
          {t("dept_course_detail.tabs.teachers")}
        </h3>
      </div>
      <ul className="max-h-56 divide-y divide-m3-outline-variant/20 overflow-y-auto overscroll-contain px-4">
        {instructors.map((instructor) => {
          const titles = [
            instructor.is_instructor
              ? t("dept_course_detail.teacher_role_course_instructor")
              : null,
            instructor.is_assistant
              ? t("dept_course_detail.teacher_role_teacher_assistant")
              : null,
          ].filter(Boolean);
          return (
            <li
              key={instructor.user_id}
              className="flex min-w-0 items-start gap-3 py-3"
            >
              <Avatar className="h-10 w-10 shrink-0">
                {instructor.avatar_url ? (
                  <AvatarImage
                    src={instructor.avatar_url}
                    alt={instructor.display_name}
                  />
                ) : null}
                <AvatarFallback className="gradient-primary font-headline text-sm font-bold text-white">
                  {avatarInitials(instructor.display_name, { uppercase: true })}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="break-words font-headline text-sm font-bold leading-snug text-m3-on-surface">
                  {instructor.display_name}
                </p>
                {titles.length > 0 && (
                  <p className="mt-0.5 break-words text-xs font-semibold text-m3-secondary">
                    {titles.join(" · ")}
                  </p>
                )}
                {instructor.headline && (
                  <p className="mt-1 break-words text-xs leading-relaxed text-m3-on-surface-variant">
                    {instructor.headline}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
