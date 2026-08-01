export type PresentationKind = "opening" | "question" | "closing";

export const PREPARATION_KEYS: Record<PresentationKind, string> = {
  opening: "course_interview.workspace.preparing_greeting",
  closing: "course_interview.workspace.preparing_goodbye",
  question: "course_interview.workspace.preparing_question",
};

export function PreparationIndicator({ label }: { label: string }) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 text-sm font-medium text-text-muted"
    >
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-primary/70 motion-safe:animate-bounce [animation-delay:-300ms]" />
        <span className="size-1.5 rounded-full bg-primary/70 motion-safe:animate-bounce [animation-delay:-150ms]" />
        <span className="size-1.5 rounded-full bg-primary/70 motion-safe:animate-bounce" />
      </span>
      {label}
    </span>
  );
}
