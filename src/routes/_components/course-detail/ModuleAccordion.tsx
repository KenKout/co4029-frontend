import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useModuleItems } from "@/lib/api/hooks/courses";
import type { ModulePublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ItemTypeIcon, SkeletonBlock } from "./CourseDetailAtoms";

/** The lesson / quiz / interview rows revealed under an open module. */
function ModuleItemsPanel({ moduleId }: { moduleId: string }) {
  const { t } = useTranslation();
  const { data: items, isLoading } = useModuleItems(moduleId);

  if (isLoading) {
    return (
      <div className="px-5 py-4">
        <SkeletonBlock className="h-10" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="border-t border-m3-outline-variant/20 px-5 py-4 text-sm text-m3-outline">
        {t("course_detail.no_items")}
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => a.position - b.position);

  return (
    <div className="border-t border-m3-outline-variant/20 divide-y divide-m3-outline-variant/10">
      {sorted.map((item) => {
        const label =
          item.item_type === "quiz"
            ? t("course_detail.item_quiz")
            : item.item_type === "interview"
              ? t("course_detail.item_interview")
              : (item.target?.title ?? t("course_detail.item_lesson"));
        return (
          <div
            key={item.id}
            className="group/item flex items-center gap-3 px-5 py-3 transition-colors hover:bg-m3-primary/5"
          >
            <ItemTypeIcon type={item.item_type} />
            <span className="text-sm text-m3-on-surface-variant flex-1 leading-snug transition-colors group-hover/item:text-m3-on-surface">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** One collapsible module header. */
function ModuleRow({
  mod,
  isOpen,
  onToggle,
}: {
  mod: ModulePublic;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "group rounded-xl overflow-hidden border bg-m3-surface-container-lowest shadow-sm transition-all duration-200",
        "hover:border-m3-primary/40 hover:shadow-md",
        isOpen ? "border-m3-primary/30" : "border-m3-outline-variant/30",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer transition-colors hover:bg-m3-primary/5"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-headline font-semibold text-sm text-m3-on-surface leading-snug transition-colors group-hover:text-m3-primary">
              {mod.title}
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-m3-outline shrink-0 ml-3 transition-colors group-hover:text-m3-primary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-m3-outline shrink-0 ml-3 transition-all duration-200 group-hover:text-m3-primary group-hover:translate-y-0.5" />
        )}
      </button>

      {isOpen && <ModuleItemsPanel moduleId={mod.id} />}
    </div>
  );
}

/** The course curriculum: modules, expandable one by one. */
export function ModuleAccordion({ modules }: { modules: ModulePublic[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const sorted = [...modules].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-2">
      {sorted.map((mod) => (
        <ModuleRow
          key={mod.id}
          mod={mod}
          isOpen={open.has(mod.id)}
          onToggle={() => toggle(mod.id)}
        />
      ))}
    </div>
  );
}
