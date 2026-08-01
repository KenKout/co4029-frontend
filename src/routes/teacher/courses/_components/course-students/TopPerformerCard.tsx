import { Link } from "@tanstack/react-router";
import { ChevronRight, UserX } from "lucide-react";

import { avatarInitials } from "@/components/ui/avatar";

import type { CourseStudentsController } from "./use-course-students-controller";

/**
 * Sidebar "Top Performer" card, extracted verbatim from the former 658-line
 * course-students.tsx where it was an inline IIFE. The caller still guards on
 * `students.length > 0`, so `top` is always present here.
 */
export function TopPerformerCard({
  controller,
}: {
  controller: CourseStudentsController;
}) {
  const { students, courseId } = controller;
  const top = [...students].sort(
    (a, b) => b.progress_percent - a.progress_percent,
  )[0];
  return (
    <Link
      to="/teacher/courses/$courseId/students/$studentId"
      params={{ courseId, studentId: top.student_id }}
      className="gradient-primary rounded-xl p-6 text-white relative overflow-hidden shadow-lg block hover:opacity-95 transition-opacity cursor-pointer"
    >
      <UserX className="absolute -bottom-4 -right-4 h-24 w-24 text-white/10 pointer-events-none" />
      <div className="relative z-10 space-y-3">
        <h4 className="font-headline font-bold text-sm text-white/80 uppercase tracking-widest">
          Top Performer
        </h4>
        <div className="flex items-center gap-3">
          {top.avatar_url ? (
            <img
              src={top.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white/40"
            />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase bg-white/20 text-white shrink-0">
              {avatarInitials(top.display_name) || "?"}
            </div>
          )}
          <div>
            <p className="font-bold text-sm">{top.display_name}</p>
            <p className="text-xs text-white/70">
              {Math.round(top.progress_percent)}% progress
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white transition-colors">
          View profile <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}
