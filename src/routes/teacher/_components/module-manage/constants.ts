import { Video, BookOpen, HelpCircle } from "lucide-react";

/**
 * Display config for the module-manage curriculum items, moved verbatim out of
 * the former 887-line `module-manage.tsx`. Icon + label + badge colour keyed by
 * lesson type, plus the quiz variant and the shared "add content" pill class.
 *
 * Deliberately NOT shared with `_components/course-manage/constants.ts`: that
 * near-twin serves the course page and uses i18n keys for every label, while
 * this page renders some labels literally. Unifying them would change rendered
 * text, so the two stay independent.
 */
export const LESSON_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
  }
> = {
  video: { label: "Video", icon: Video, badge: "bg-blue-50 text-blue-700" },
  reading: {
    label: "Reading",
    icon: BookOpen,
    badge: "bg-emerald-50 text-emerald-700",
  },
};

export const QUIZ_ITEM_CONFIG = {
  label: "teacher_common.quiz_label",
  icon: HelpCircle,
  badge: "bg-blue-50 text-blue-800",
};

export const ADD_PILL_CLS =
  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-m3-on-surface-variant " +
  "bg-m3-surface-container-lowest border border-m3-outline-variant/20 " +
  "hover:bg-m3-primary-fixed hover:text-m3-primary hover:border-m3-primary/20 transition-colors cursor-pointer";
