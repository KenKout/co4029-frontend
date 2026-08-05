import type { useTranslation } from "react-i18next";
import type {
  InterviewSessionPublic,
  ModuleItemPublic,
  ModulePublic,
} from "@/lib/api/types";
import type { TABS } from "./constants";

/**
 * Shared types for the student course-learn screen, extracted from the former
 * 1.2k-line course-learn.tsx so the page shell, the curriculum components and
 * the hooks agree on one definition instead of passing loosely-typed props.
 */

// type LessonState = "active" | "completed" | "pending" | "locked";
export type LessonState = "active" | "completed" | "pending";

export interface FlatItem {
  moduleId: string;
  moduleTitle: string;
  item: ModuleItemPublic;
  label: string;
}

export type Tab = (typeof TABS)[number];

/** The `t` handed out by react-i18next's useTranslation(). */
export type Translate = ReturnType<typeof useTranslation>["t"];

/**
 * Everything a curriculum listing needs. Both the course-home curriculum and
 * the lesson-mode sidebar render the same module sections, so the page shell
 * builds this once and spreads it into both.
 */
export interface CurriculumProps {
  sortedModules: ModulePublic[];
  flatItems: FlatItem[];
  lessonItems: FlatItem[];
  itemState: (fi: FlatItem) => LessonState;
  onSelect: (idx: number) => void;
  slug: string;
  activeModuleId?: string;
  inProgressByConfigId: Map<string, InterviewSessionPublic>;
  /** Id of the earliest pending item (course order) — the row to highlight. */
  nextItemId?: string;
}
