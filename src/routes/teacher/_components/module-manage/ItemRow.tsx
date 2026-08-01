import { useTranslation } from "react-i18next";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CourseContentItem } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";
import { resolveItemDisplay } from "./helpers";
import { ItemRowActions } from "./ItemRowActions";
import { ItemRowTitle } from "./ItemRowTitle";

/**
 * A single curriculum item (lesson / quiz / interview) inside the module: drag
 * grip, type icon, title link, type + status badges and the action cluster.
 *
 * Extracted from the former 887-line `module-manage.tsx`, where this row was a
 * single 204-line / complexity-51 function. The icon/label/title/status
 * derivations now live in `helpers.ts` and the title cell + action cluster are
 * their own components; every expression is carried over unchanged.
 */
export function ItemRow({
  item,
  courseId,
  isDragOver,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDelete,
}: {
  item: CourseContentItem;
  courseId: string;
  isDragOver: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onDelete: (title: string) => void;
}) {
  const { t } = useTranslation();
  const { cfg, Icon, label, title, status } = resolveItemDisplay(item, t);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all group select-none cursor-grab active:cursor-grabbing",
        isDragging ? "opacity-40" : "",
        isDragOver
          ? "bg-m3-primary-fixed border border-m3-primary/30 shadow-sm"
          : "hover:bg-m3-surface-container",
      )}
    >
      <GripVertical className="h-4 w-4 text-m3-outline-variant shrink-0" />
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          cfg?.badge ?? "bg-slate-50 text-slate-500",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <ItemRowTitle item={item} courseId={courseId} title={title} />
      <Badge
        className={cn(
          "text-[10px] border-0 shrink-0",
          cfg?.badge ?? "bg-slate-100 text-slate-500",
        )}
      >
        {label}
      </Badge>
      {status && (
        <Badge
          className={cn(
            "text-[10px] border-0 shrink-0",
            status === "published"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-50 text-amber-700",
          )}
        >
          {status}
        </Badge>
      )}
      <ItemRowActions
        item={item}
        courseId={courseId}
        title={title}
        t={t}
        onDelete={onDelete}
      />
    </div>
  );
}
