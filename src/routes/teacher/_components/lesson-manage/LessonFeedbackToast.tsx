import { cn } from "@/lib/utils";

/**
 * Bottom-centred transient status bar ("… attached successfully.", "Resource
 * removed."). Always mounted so it can fade in and out; `aria-live` announces
 * the message when it changes.
 */
export function LessonFeedbackToast({ feedback }: { feedback: string | null }) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl bg-m3-on-surface text-m3-surface text-sm font-bold transition-all duration-300",
        feedback
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none",
      )}
    >
      {feedback}
    </div>
  );
}
