import { useTranslation } from "react-i18next";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CourseContentItem } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { resolveItemDisplay } from "./helpers";
import { ModuleItemRowActions } from "./ModuleItemRowActions";
import { ModuleItemRowTitle } from "./ModuleItemRowTitle";
import { ModuleItemStatusBadge } from "./ModuleItemStatusBadge";
import { useModuleItemRow } from "./use-module-item-row";

/**
 * A single curriculum item (lesson / quiz / interview) inside a module: icon +
 * type badge, title link to its editor, inline publish for drafts, duplicate,
 * and a drag handle. Dragging is armed only while the grip is held so the
 * title link and action buttons stay clickable.
 *
 * Previously a single 254-line / complexity-56 function. The icon/label/title/
 * status derivations now live in `helpers.ts`, the publish + duplicate
 * mutations in `use-module-item-row.ts`, and the title cell / status cell /
 * action cluster are their own components; every expression is unchanged.
 */
export function ModuleItemRow({
  item,
  courseId,
  isDragOver,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  item: CourseContentItem;
  courseId: string;
  isDragOver: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const { t } = useTranslation();
  const { cfg, Icon, label, title, status } = resolveItemDisplay(item, t);
  const {
    dragEnabled,
    setDragEnabled,
    duplicateItem,
    publishing,
    handleDuplicateItem,
    handlePublish,
  } = useModuleItemRow({ item, courseId, title, t });

  return (
    <div
      draggable={dragEnabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={() => {
        setDragEnabled(false);
        onDragEnd();
      }}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all group select-none",
        isDragging ? "opacity-40" : "",
        isDragOver
          ? "ring-2 ring-m3-primary/40 bg-m3-primary-fixed shadow-sm"
          : "bg-m3-surface hover:bg-m3-surface-container",
      )}
    >
      {/* Drag handle: dragging is enabled ONLY while grabbing this grip, so the
          title link + action buttons stay clickable. Previously the whole row
          was draggable but the title <Link draggable={false}> covered most of
          it and swallowed drag-starts — the "item drag doesn't work" bug. */}
      <Button variant="ghost"
        type="button"
        aria-label={t("teacher_common.drag_to_reorder")}
        onMouseDown={() => setDragEnabled(true)}
        onMouseUp={() => setDragEnabled(false)}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 -m-0.5 text-m3-outline-variant hover:text-m3-on-surface-variant"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </Button>
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          cfg?.badge ?? "bg-slate-50 text-slate-500",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <ModuleItemRowTitle item={item} courseId={courseId} title={title} />
      <Badge
        className={cn(
          "text-[10px] border-0 shrink-0",
          cfg?.badge ?? "bg-slate-100 text-slate-500",
        )}
      >
        {label}
      </Badge>
      {status && (
        <ModuleItemStatusBadge
          status={status}
          publishing={publishing}
          onPublish={handlePublish}
          t={t}
        />
      )}
      <ModuleItemRowActions
        item={item}
        courseId={courseId}
        duplicateItem={duplicateItem}
        onDuplicate={handleDuplicateItem}
        t={t}
      />
    </div>
  );
}
