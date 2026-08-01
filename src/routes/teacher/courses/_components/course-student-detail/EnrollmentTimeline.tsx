import type { RosterStudent } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

import { buildTimelineEntries } from "./helpers";

/**
 * "Enrollment Timeline" section — enrolled, last activity, completed and
 * dropped milestones on a vertical rail. Extracted verbatim from the former
 * 659-line course-student-detail.tsx; the entry list itself moved to
 * `buildTimelineEntries` so the conditional milestones stay one expression.
 */
export function EnrollmentTimeline({ student }: { student: RosterStudent }) {
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-5">
      <h2 className="font-headline font-bold text-lg text-m3-on-surface">
        Enrollment Timeline
      </h2>

      <div className="space-y-0 relative">
        <div className="absolute left-5 top-5 bottom-5 w-px bg-m3-outline-variant/20" />

        {buildTimelineEntries(student).map((entry, idx, arr) => (
          <div key={entry.label} className="flex gap-4 relative pb-6">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center z-10 shrink-0",
                entry.bg,
              )}
            >
              <entry.icon className={cn("h-4 w-4", entry.color)} />
            </div>
            <div
              className={cn(
                "flex-1 pt-1.5",
                idx < arr.length - 1 ? "pb-2" : "",
              )}
            >
              <div className="flex justify-between items-start mb-0.5">
                <p className="text-sm font-semibold text-m3-on-surface">
                  {entry.label}
                </p>
                <span className="text-xs text-m3-on-surface-variant shrink-0 ml-3">
                  {entry.date}
                </span>
              </div>
              <p className="text-sm text-m3-on-surface-variant">
                {entry.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
