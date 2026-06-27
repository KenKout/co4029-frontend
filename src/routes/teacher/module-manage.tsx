import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Video,
  HelpCircle,
  BookOpen,
  GripVertical,
  Pencil,
  Check,
  Loader2,
  Plus,
  Save,
  Trash2,
  CheckCircle,
  EyeOff,
  Mic,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
  useUpdateModule,
  useCreateLesson,
  useReorderModuleItems,
  useDeleteModuleItem,
} from "@/lib/api/hooks/teacher-courses";
import { useCreateQuiz } from "@/lib/api/hooks/quizzes";
import type {
  CourseContentItem,
  CourseContentLesson,
  CourseContentModule,
} from "@/lib/api/types/common";
import { cn } from "@/lib/utils";

const LESSON_TYPE_CONFIG: Record<
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

const QUIZ_ITEM_CONFIG = {
  label: "teacher_common.quiz_label",
  icon: HelpCircle,
  badge: "bg-blue-50 text-blue-800",
};

const ADD_PILL_CLS =
  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-m3-on-surface-variant " +
  "bg-m3-surface-container-lowest border border-m3-outline-variant/20 " +
  "hover:bg-m3-primary-fixed hover:text-m3-primary hover:border-m3-primary/20 transition-colors cursor-pointer";

function ItemRow({
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
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const lesson = item.lesson;
  const quiz = item.quiz;
  const interview = item.interview;
  const lessonType = item.target?.lesson_type ?? lesson?.lesson_type ?? "video";
  const cfg = item.item_type === "quiz"
    ? QUIZ_ITEM_CONFIG
    : item.item_type === "lesson"
      ? (LESSON_TYPE_CONFIG[lessonType] ?? LESSON_TYPE_CONFIG["video"])
      : null;
  const Icon = cfg?.icon ?? BookOpen;
  const label = item.item_type === "quiz"
    ? t(QUIZ_ITEM_CONFIG.label)
    : item.item_type === "interview"
      ? t("teacher_common.interview_label")
      : (cfg?.label ?? item.item_type);
  const title = item.target?.title ?? lesson?.title ?? quiz?.title ?? interview?.title ?? label;
  const status = item.target?.status ?? lesson?.status ?? quiz?.status ?? interview?.status;

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
      {item.item_type === "lesson" && item.lesson_id ? (
        <Link
          to="/teacher/courses/$courseId/lessons/$lessonId"
          params={{ courseId, lessonId: item.lesson_id }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-sm font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer"
        >
          {title}
        </Link>
      ) : item.item_type === "quiz" && item.quiz_id ? (
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId, quizId: item.quiz_id }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-sm font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer"
        >
          {title}
        </Link>
      ) : item.item_type === "interview" && item.interview_config_id ? (
        <Link
          to="/teacher/courses/$courseId/interview-configs/$configId"
          params={{ courseId, configId: item.interview_config_id }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-sm font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer"
        >
          {title}
        </Link>
      ) : (
        <span className="flex-1 text-sm font-medium text-m3-on-surface truncate">
          {title}
        </span>
      )}
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
      <div className="flex items-center gap-1 text-m3-on-surface-variant shrink-0">
        {item.item_type === "lesson" && item.lesson_id && (
          <Link
            to="/teacher/courses/$courseId/lessons/$lessonId"
            params={{ courseId, lessonId: item.lesson_id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-m3-on-surface">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
        {item.item_type === "quiz" && item.quiz_id && (
          <Link
            to="/teacher/courses/$courseId/quizzes/$quizId"
            params={{ courseId, quizId: item.quiz_id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-m3-on-surface">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
        {item.item_type === "interview" && item.interview_config_id && (
          <Link
            to="/teacher/courses/$courseId/interview-configs/$configId"
            params={{ courseId, configId: item.interview_config_id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-m3-on-surface">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-m3-error hover:bg-m3-error/10"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function AddContentPills({
  moduleId,
  courseId,
  itemCount,
}: {
  moduleId: string;
  courseId: string;
  itemCount: number;
}) {
  const navigate = useNavigate();
  const createLesson = useCreateLesson(moduleId, courseId);
  const createQuiz = useCreateQuiz(courseId);
  const [adding, setAdding] = useState(false);

  function slugify(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleAdd(lessonType: string) {
    if (adding) return;
    const label = LESSON_TYPE_CONFIG[lessonType]?.label ?? lessonType;
    const title = `New ${label}`;
    setAdding(true);
    try {
      await createLesson.mutateAsync({
        title,
        slug: `${slugify(title)}-${Date.now().toString(36)}`,
        lesson_type: lessonType as "video" | "reading",
      });
      toast.success(`${label} added`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add lesson");
    } finally {
      setAdding(false);
    }
  }

  async function handleAddQuiz() {
    if (adding) return;
    setAdding(true);
    try {
      const quiz = await createQuiz.mutateAsync({
        module_id: moduleId,
        title: `New Quiz ${itemCount + 1}`,
        description: "Draft quiz for this module.",
      });
      void navigate({
        to: "/teacher/courses/$courseId/quizzes/$quizId",
        params: { courseId, quizId: quiz.id },
      });
      toast.success("Quiz added");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add quiz");
    } finally {
      setAdding(false);
    }
  }

  function handleAddInterview() {
    void navigate({
      to: "/teacher/courses/$courseId/interview-configs/new",
      params: { courseId },
      search: { moduleId },
    });
  }

  return (
    <div className="flex flex-wrap gap-2 mt-1 pt-4 border-t border-m3-outline-variant/10">
      <span className="w-full text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant mb-1">
        Add Content
      </span>
      {Object.entries(LESSON_TYPE_CONFIG).map(([type, cfg]) => {
        const Icon = cfg.icon;
        return (
          <button
            key={type}
            type="button"
            disabled={adding}
            onClick={() => handleAdd(type)}
            className={ADD_PILL_CLS}
          >
            <Icon className="h-3.5 w-3.5" />
            <Plus className="h-3 w-3 -ml-0.5" />
            {cfg.label}
          </button>
        );
      })}
      <button
        type="button"
        disabled={adding}
        onClick={handleAddQuiz}
        className={ADD_PILL_CLS}
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <Plus className="h-3 w-3 -ml-0.5" />
        Quiz
      </button>
      <button
        type="button"
        disabled={adding}
        onClick={handleAddInterview}
        className={ADD_PILL_CLS}
      >
        <Mic className="h-3.5 w-3.5" />
        <Plus className="h-3 w-3 -ml-0.5" />
        Interview
      </button>
    </div>
  );
}

function ModuleSettings({
  module,
  courseId,
}: {
  module: CourseContentModule;
  courseId: string;
}) {
  const updateModule = useUpdateModule(module.id, courseId);
  const [description, setDescription] = useState(module.description ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    module.estimated_minutes?.toString() ?? "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateModule.mutateAsync({
        description: description.trim() || undefined,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
      });
      toast.success("Module settings saved");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const items = module.items ?? [];
  const publishedCount = items.filter((i) => {
    if (i.item_type === "lesson") return i.lesson?.status === "published";
    if (i.item_type === "quiz") return i.quiz?.status === "published";
    if (i.item_type === "interview") return i.interview?.status === "published";
    return false;
  }).length;
  const draftCount = items.length - publishedCount;

  return (
    <div className="space-y-5">
      <div className="bg-m3-surface-container-low rounded-xl p-5 space-y-4">
        <h3 className="font-headline font-bold text-base text-m3-primary">
          Module Stats
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Items", value: items.length },
            { label: "Published", value: publishedCount },
            { label: "Draft", value: draftCount },
            { label: "Est. Minutes", value: module.estimated_minutes ?? "—" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-m3-surface rounded-xl p-3 text-center"
            >
              <p className="text-lg font-headline font-bold text-m3-primary">
                {value}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-m3-surface-container-low rounded-xl p-5 space-y-4"
      >
        <h3 className="font-headline font-bold text-base text-m3-primary">
          Settings
        </h3>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of this module…"
            className="w-full px-4 py-3 text-sm bg-m3-surface border border-m3-outline-variant/20 rounded-xl text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/20 transition-all placeholder:text-m3-on-surface-variant/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Estimated Duration (min)
          </label>
          <Input
            type="number"
            min={0}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            placeholder="e.g. 60"
            className="text-sm bg-m3-surface"
          />
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={saving}
          className="w-full gap-2 gradient-primary text-white border-0"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </form>
    </div>
  );
}

export default function ModuleManagePage() {
  const { t } = useTranslation();
  const { courseId, moduleId } = useParams({ strict: false }) as {
    courseId: string;
    moduleId: string;
  };

  const { data: course } = useTeacherCourseById(courseId);
  const { data: content, isLoading } = useTeacherCourseContent(courseId);

  const module: CourseContentModule | undefined = content?.modules.find(
    (m) => m.id === moduleId,
  );

  const updateModule = useUpdateModule(moduleId, courseId);
  const reorderItems = useReorderModuleItems(moduleId, courseId);
  const deleteItem = useDeleteModuleItem(courseId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-24 text-m3-on-surface-variant">
        Module not found.{" "}
        <Link
          to="/teacher/courses/$courseId"
          params={{ courseId }}
          className="text-m3-primary hover:underline"
        >
          Back to course
        </Link>
      </div>
    );
  }

  const sortedItems = [...(module.items ?? [])].sort((a, b) => a.position - b.position);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setTitleDraft(module!.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  function saveTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== module!.title) {
      updateModule.mutate(
        { title: trimmed },
        {
          onError: (err) => toast.error((err as Error).message),
        },
      );
    }
  }

  function toggleStatus() {
    const next = module!.status === "published" ? "draft" : "published";
    updateModule.mutate(
      { status: next },
      {
        onSuccess: () =>
          toast.success(
            next === "published" ? "Module published" : "Module unpublished",
          ),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  function handleDrop(dropIdx: number) {
    if (dragSourceIdx === null || dragSourceIdx === dropIdx) {
      setDragSourceIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newOrder = [...sortedItems];
    const [moved] = newOrder.splice(dragSourceIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    reorderItems.mutate(
      newOrder.map((i) => i.id),
      {
        onError: (err) =>
          toast.error((err as Error).message || "Reorder failed"),
      },
    );
    setDragSourceIdx(null);
    setDragOverIdx(null);
  }

  function handleDeleteItem(itemId: string) {
    deleteItem.mutate(itemId, {
      onSuccess: () => toast.success("Item removed"),
      onError: (err) => toast.error((err as Error).message),
    });
  }

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("teacher_common.breadcrumb_teaching"), to: "/teacher/courses" },
          {
            label: course?.title ?? t("teacher_common.breadcrumb_course"),
            to: "/teacher/courses/$courseId",
            params: { courseId },
          },
          { label: module.title },
        ]}
      />

      <div className="flex items-start gap-3">
        <Link to="/teacher/courses/$courseId" params={{ courseId }}>
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setEditingTitle(false);
                  setTitleDraft(module.title);
                }
              }}
              className="w-full font-headline font-bold text-2xl text-m3-primary bg-transparent border-b-2 border-m3-primary outline-none py-0.5"
            />
          ) : (
            <div className="flex items-center gap-2 group">
              <h1
                className="font-headline font-bold text-2xl text-m3-on-surface cursor-text"
                onClick={startEdit}
              >
                {updateModule.isPending &&
                updateModule.variables &&
                "title" in updateModule.variables
                  ? ((updateModule.variables as { title?: string }).title ??
                    module.title)
                  : module.title}
              </h1>
              <button
                type="button"
                onClick={startEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary cursor-pointer"
              >
                {editingTitle ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Pencil className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full border-0",
                module.status === "published"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-50 text-amber-700",
              )}
            >
              {updateModule.isPending &&
              updateModule.variables &&
              "status" in updateModule.variables
                ? "…"
                : module.status}
            </span>
            <span className="text-xs text-m3-on-surface-variant">
              {sortedItems.length} item{sortedItems.length !== 1 ? "s" : ""}
              {module.estimated_minutes && ` · ~${module.estimated_minutes}m`}
            </span>
          </div>
        </div>

        <Button
          type="button"
          onClick={toggleStatus}
          disabled={updateModule.isPending}
          variant={module.status === "published" ? "outline" : "default"}
          className={cn(
            "shrink-0 gap-2",
            module.status === "published"
              ? ""
              : "bg-emerald-600 text-white hover:bg-emerald-700 border-0",
          )}
          title={
            module.status === "published"
              ? "Hide this module from students"
              : "Make this module visible to enrolled students"
          }
        >
          {updateModule.isPending &&
          updateModule.variables &&
          "status" in updateModule.variables ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : module.status === "published" ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {module.status === "published" ? "Unpublish" : "Publish"}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-m3-surface-container-low rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-m3-outline-variant/10 flex items-center gap-2">
              <h2 className="font-headline font-bold text-sm text-m3-on-surface flex-1">
                Curriculum Items
              </h2>
              <span className="text-xs text-m3-on-surface-variant">
                Drag to reorder
              </span>
            </div>

            <div className="p-4 space-y-1.5">
              {sortedItems.length === 0 && (
                <p className="text-sm text-m3-on-surface-variant text-center py-6">
                  No items yet. Add one below.
                </p>
              )}
              {sortedItems.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  courseId={courseId}
                  isDragOver={dragOverIdx === idx}
                  isDragging={dragSourceIdx === idx}
                  onDragStart={(e) => {
                    setDragSourceIdx(idx);
                    const el = e.currentTarget as HTMLElement;
                    const rect = el.getBoundingClientRect();
                    e.dataTransfer.setDragImage(
                      el,
                      e.clientX - rect.left,
                      e.clientY - rect.top,
                    );
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIdx(idx);
                  }}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => {
                    setDragSourceIdx(null);
                    setDragOverIdx(null);
                  }}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              ))}

              <AddContentPills
                moduleId={moduleId}
                courseId={courseId}
                itemCount={sortedItems.length}
              />
            </div>
          </div>
        </div>

        <aside className="col-span-12 lg:col-span-4 lg:sticky lg:top-24 self-start">
          <ModuleSettings module={module} courseId={courseId} />
        </aside>
      </div>
    </div>
  );
}