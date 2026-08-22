import type { BookOpen } from "lucide-react";

/**
 * The "nothing here yet" box shared by the courses, students and progress
 * tabs. Markup is byte-identical across all three; only the icon and copy
 * differ, so they come in as props.
 */
export function EmptyState({
  icon: Icon,
  text,
}: {
  icon: typeof BookOpen;
  text: string;
}) {
  return (
    <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
      <Icon className="h-8 w-8 mx-auto mb-3 text-m3-outline" />
      <p className="text-sm text-m3-on-surface-variant">{text}</p>
    </div>
  );
}
