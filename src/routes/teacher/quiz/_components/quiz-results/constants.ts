import {
  ClipboardCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  History,
  Sigma,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { ResultsTab } from "./types";

/**
 * Tab definitions in render order. Replaces the seven hand-written, otherwise
 * identical tab buttons of the pre-split page — same ids, same icons, same
 * i18n keys, same order.
 */
export const RESULTS_TABS: ReadonlyArray<{
  id: ResultsTab;
  icon: LucideIcon;
  labelKey: string;
}> = [
  {
    id: "students",
    icon: Users,
    labelKey: "teacher_quiz_results.tabs.by_student",
  },
  {
    id: "questions",
    icon: HelpCircle,
    labelKey: "teacher_quiz_results.tabs.by_question",
  },
  {
    id: "responses",
    icon: FileText,
    labelKey: "teacher_quiz_results.tabs.responses",
  },
  {
    id: "statistics",
    icon: Sigma,
    labelKey: "teacher_quiz_results.tabs.statistics",
  },
  {
    id: "grading",
    icon: ClipboardCheck,
    labelKey: "teacher_quiz_results.tabs.grading",
  },
  {
    id: "gradebook",
    icon: GraduationCap,
    labelKey: "teacher_quiz_results.tabs.gradebook",
  },
  { id: "audit", icon: History, labelKey: "teacher_quiz_results.tabs.audit" },
];

/** Shared className for one tab button; `active` swaps the elevation pair. */
export const TAB_BUTTON_BASE =
  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer";
export const TAB_BUTTON_ACTIVE = "bg-surface-elev text-m3-primary shadow-sm";
export const TAB_BUTTON_IDLE =
  "text-m3-on-surface-variant hover:text-m3-primary/80";
