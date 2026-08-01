import { useTranslation } from "react-i18next";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarInitials,
} from "@/components/ui/avatar";
import type { InstructorRead } from "@/lib/api/types";

/** Avatar + "created by" line under the course title. */
export function InstructorLine({
  instructor,
}: {
  instructor: InstructorRead | null;
}) {
  const { t } = useTranslation();
  if (!instructor) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-m3-on-surface-variant">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-m3-surface-container text-m3-on-surface-variant text-xs font-bold">
            ?
          </AvatarFallback>
        </Avatar>
        <span>{t("course_detail.instructor_unknown")}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 text-sm text-m3-on-surface-variant">
      <Avatar className="h-7 w-7">
        {instructor.avatar_url ? (
          <AvatarImage
            src={instructor.avatar_url}
            alt={instructor.display_name}
          />
        ) : null}
        <AvatarFallback className="gradient-secondary text-white text-xs font-bold">
          {avatarInitials(instructor.display_name, { uppercase: true })}
        </AvatarFallback>
      </Avatar>
      <span>
        {t("course_detail.created_by")}{" "}
        <span className="text-m3-on-surface font-semibold">
          {instructor.display_name}
        </span>
        {instructor.headline && (
          <span className="text-m3-on-surface-variant/60">
            {" "}
            · {instructor.headline}
          </span>
        )}
      </span>
    </div>
  );
}
