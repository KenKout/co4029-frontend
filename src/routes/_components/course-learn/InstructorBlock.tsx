import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarInitials,
} from "@/components/ui/avatar";
import type { InstructorRead } from "@/lib/api/types";

export function InstructorBlock({
  instructor,
}: {
  instructor: InstructorRead;
}) {
  return (
    <div className="glass ghost-border rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
      <Avatar className="h-20 w-20 shrink-0 ring-4 ring-white shadow-xl">
        {instructor.avatar_url ? (
          <AvatarImage
            src={instructor.avatar_url}
            alt={instructor.display_name}
          />
        ) : null}
        <AvatarFallback className="gradient-primary text-white text-xl font-bold font-headline">
          {avatarInitials(instructor.display_name, { uppercase: true })}
        </AvatarFallback>
      </Avatar>
      <div className="text-center sm:text-left">
        <h3 className="text-lg font-headline font-bold text-m3-primary">
          {instructor.display_name}
        </h3>
        <p className="text-m3-secondary font-semibold text-xs mt-0.5 mb-2">
          Instructor
        </p>
        {instructor.headline && (
          <p className="text-m3-on-surface-variant text-sm leading-relaxed">
            {instructor.headline}
          </p>
        )}
      </div>
    </div>
  );
}
