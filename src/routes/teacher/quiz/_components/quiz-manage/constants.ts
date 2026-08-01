import type { ComponentType } from "react";
import { Eye, ListChecks, Settings } from "lucide-react";

import type { TabKey } from "@/routes/teacher/_components/quiz-manage/types";

/**
 * Static tab metadata for the quiz-manage page shell, extracted verbatim from
 * quiz-manage.tsx so the tab strip component and the orchestrator share one
 * definition.
 */

// Tab order: Settings first (configure the quiz), then Questions (author the
// content), then Preview (see it as a student). Matches the natural authoring
// flow teachers follow.
export const TAB_KEYS: ReadonlyArray<TabKey> = [
  "settings",
  "questions",
  "preview",
];

// Icon per tab — used for the condensed icon-only vertical rail that the tab
// strip morphs into once it sticks under the global top bar.
export const TAB_ICONS: Record<
  TabKey,
  ComponentType<{ className?: string }>
> = {
  questions: ListChecks,
  settings: Settings,
  preview: Eye,
};
