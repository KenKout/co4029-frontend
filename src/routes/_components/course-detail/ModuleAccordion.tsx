import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
} from "lucide-react";
import { useModuleItems } from "@/lib/api/hooks/courses";
import type { ModulePublic, MyCourseProgressSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  lessonCount,
  moduleCompletion,
} from "@/routes/_components/course-detail/helpers";
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

/** One collapsible module header, numbered and annotated with lesson count. */
function ModuleRow({
  mod,
  index,
  isOpen,
  onToggle,
  progress,
}: {
  mod: ModulePublic;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  progress?: MyCourseProgressSummary;
}) {
  const { t } = useTranslation();
  const lessons = lessonCount(mod);
  const completion = moduleCompletion(mod, progress);
  const doneCount = completion === "complete"
    ? lessons
    : completion === "partial"
      ? mod.items.filter(
          (i) =>
            i.item_type === "lesson" &&
            progress?.lessons.some(
              (l) => l.lesson_id === i.target?.id && l.status === "completed",
            ),
        ).length
      : 0;

  return (
    <div
      className={cn(
        "group rounded-xl overflow-hidden border bg-m3-surface-container-lowest shadow-sm transition-all duration-200",
        "hover:border-m3-primary/40 hover:shadow-md",
        isOpen ? "border-m3-primary/30" : "border-m3-outline-variant/30",
      )}
    >
      <Button variant="ghost"
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer transition-colors hover:bg-m3-primary/5"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
            <span className="text-sm font-black text-white">{index + 1}</span>
          </div>
          <div className="min-w-0">
            <p className="font-headline font-semibold text-sm text-m3-on-surface leading-snug transition-colors group-hover:text-m3-primary">
              {mod.title}
            </p>
            {lessons > 0 && (
              <p className="text-[11px] text-m3-on-surface-variant mt-0.5">
                {t("course_detail.lessons_count", { count: lessons })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          {/* Completion mark: green check when every lesson is done, a
              "x/y" tally when partway through, nothing before start. */}
          {completion === "complete" && (
            <span
              className="flex items-center gap-1 text-emerald-600"
              title={t("course_detail.module_complete")}
            >
              <CheckCircle2 className="h-4 w-4" />
            </span>
          )}
          {completion === "partial" && (
            <span className="text-[11px] font-bold text-m3-secondary tabular-nums">
              {doneCount}/{lessons}
            </span>
          )}
          {completion === "none" && lessons > 0 && (
            <CircleDashed className="h-4 w-4 text-m3-outline/60" />
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-m3-outline shrink-0 transition-colors group-hover:text-m3-primary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-m3-outline shrink-0 transition-all duration-200 group-hover:text-m3-primary group-hover:translate-y-0.5" />
          )}
        </div>
      </Button>

      {isOpen && <ModuleItemsPanel moduleId={mod.id} />}
    </div>
  );
}

/** The course curriculum: modules, expandable one by one, numbered. */
export function ModuleAccordion({
  modules,
  progress,
}: {
  modules: ModulePublic[];
  progress?: MyCourseProgressSummary;
}) {
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
      {sorted.map((mod, idx) => (
        <ModuleRow
          key={mod.id}
          mod={mod}
          index={idx}
          isOpen={open.has(mod.id)}
          onToggle={() => toggle(mod.id)}
          progress={progress}
        />
      ))}
    </div>
  );
}
