import type { useTranslation } from "react-i18next";
import type {
  useDeleteModuleItem,
  useReorderModuleItems,
  useUpdateModule,
} from "@/lib/api/hooks/teacher-courses";

/**
 * Shared types for the module-manage workspace, extracted from the former
 * 887-line `module-manage.tsx` so the orchestrator, its hooks and its
 * presentational components agree on one definition instead of passing loosely
 * typed props. No behavioural surface of its own.
 */

/** `t` exactly as the page's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];

export type UpdateModuleMutation = ReturnType<typeof useUpdateModule>;
export type ReorderItemsMutation = ReturnType<typeof useReorderModuleItems>;
export type DeleteItemMutation = ReturnType<typeof useDeleteModuleItem>;

/** Icon + label + badge triple stored in `LESSON_TYPE_CONFIG`/`QUIZ_ITEM_CONFIG`. */
export interface ItemTypeConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}

/** The item awaiting delete confirmation in the page's `ConfirmDialog`. */
export interface PendingDelete {
  id: string;
  title: string;
}

/** Everything a curriculum row needs to render, resolved from one item. */
export interface ItemDisplay {
  cfg: ItemTypeConfig | null;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  status: string | undefined;
}

/** Item counts shown in the module stats grid. */
export interface ModuleStats {
  total: number;
  publishedCount: number;
  draftCount: number;
}
