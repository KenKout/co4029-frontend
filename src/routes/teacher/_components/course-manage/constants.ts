import { Video, BookOpen, HelpCircle, Mic } from "lucide-react";

/**
 * Shared display config for the course-manage curriculum items. Icon + i18n
 * label key + badge colour, keyed by item/lesson type. Used by AddLessonPills
 * (renders the "add" pills) and ModuleItemRow (renders an existing item).
 */
export const LESSON_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
  }
> = {
  video: {
    label: "teacher_common.video_label",
    icon: Video,
    badge: "bg-blue-50 text-blue-700",
  },
  reading: {
    label: "teacher_common.reading_label",
    icon: BookOpen,
    badge: "bg-emerald-50 text-emerald-700",
  },
};

export const QUIZ_ITEM_CONFIG = {
  label: "teacher_common.quiz_label",
  icon: HelpCircle,
  badge: "bg-blue-50 text-blue-800",
};

export const INTERVIEW_ITEM_CONFIG = {
  label: "teacher_common.interview_label",
  icon: Mic,
  badge: "bg-slate-50 text-slate-600",
};

export const ADD_PILL_CLS =
  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-m3-on-surface-variant " +
  "bg-m3-surface-container-lowest border border-m3-outline-variant/20 " +
  "hover:bg-m3-primary-fixed hover:text-m3-primary hover:border-m3-primary/20 transition-colors cursor-pointer";
