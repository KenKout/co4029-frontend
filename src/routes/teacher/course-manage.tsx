import { useState, useRef } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight,
  Video, BookOpen, GripVertical, HelpCircle, Mic,
  Pencil, Loader2, ArrowRight, Check, Users, UserPlus, Activity,
  Settings, Save, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
  useCreateModule,
  useCreateLesson,
  useUpdateModule,
  useUpdateCourse,
  useReorderModuleItems,
} from "@/lib/api/hooks/teacher-courses";
import { useCreateQuiz } from "@/lib/api/hooks/quizzes";
import type { CourseContentItem, CourseContentModule } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";

const LESSON_TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; badge: string }> = {
  video:    { label: "Video",    icon: Video,       badge: "bg-blue-50 text-blue-700" },
  reading:  { label: "Reading",  icon: BookOpen,    badge: "bg-emerald-50 text-emerald-700" },
};

const QUIZ_ITEM_CONFIG = { label: "teacher_common.quiz_label", icon: HelpCircle, badge: "bg-blue-50 text-blue-800" };
const INTERVIEW_ITEM_CONFIG = { label: "teacher_common.interview_label", icon: Mic, badge: "bg-slate-50 text-slate-600" };

const ADD_PILL_CLS =
  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-m3-on-surface-variant " +
  "bg-m3-surface-container-lowest border border-m3-outline-variant/20 " +
  "hover:bg-m3-primary-fixed hover:text-m3-primary hover:border-m3-primary/20 transition-colors cursor-pointer";

function CourseSettingsPanel({ courseId }: { courseId: string }) {
  const { data: course } = useTeacherCourseById(courseId);
  const updateCourse = useUpdateCourse(courseId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [enrollmentCap, setEnrollmentCap] = useState("");
  const [completionDays, setCompletionDays] = useState("");
  const initialized = useRef(false);

  if (course && !initialized.current) {
    initialized.current = true;
    setTitle(course.title ?? "");
    setSlug(course.slug ?? "");
    setDescription(course.description ?? "");
    setLevel(course.level ?? "");
    setStatus(course.status ?? "draft");
    setEstimatedMinutes(course.estimated_minutes?.toString() ?? "");
    setEnrollmentCap(course.enrollment_cap?.toString() ?? "");
    setCompletionDays(course.expected_completion_days?.toString() ?? "");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateCourse.mutateAsync({
        slug: slug.trim() || undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        level: (level || undefined) as "beginner" | "intermediate" | "advanced" | undefined,
        status: (status || undefined) as "draft" | "published" | "archived" | undefined,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
        enrollment_cap: enrollmentCap ? Number(enrollmentCap) : undefined,
        expected_completion_days: completionDays ? Number(completionDays) : undefined,
      });
      toast.success("Course settings saved");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Save failed");
    }
  }

  return (
    <div className="rounded-xl border border-m3-outline-variant/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-m3-surface-container-low hover:bg-m3-surface-container transition-colors text-left cursor-pointer"
      >
        <Settings className="h-4 w-4 text-m3-secondary shrink-0" />
        <span className="flex-1 text-sm font-bold text-m3-on-surface">Course Settings</span>
        <span className="text-xs text-m3-on-surface-variant mr-2 hidden sm:block">
          {course?.status === "published" ? "Published" : "Draft"} · {course?.level ?? "No level"}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-m3-on-surface-variant" />
        ) : (
          <ChevronRight className="h-4 w-4 text-m3-on-surface-variant" />
        )}
      </button>

      {open && (
        <form onSubmit={handleSave} className="p-5 border-t border-m3-outline-variant/10 bg-m3-surface space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Course Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Machine Learning Fundamentals"
                className="text-sm"
              />
            </div>

            {/* Slug */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Course Slug</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. ml-fundamentals"
                className="text-sm"
              />
              <p className="text-[11px] text-m3-on-surface-variant">
                Used in the course URL. Must be unique.
              </p>
            </div>

            {/* Description */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief overview of what students will learn…"
                className="w-full px-4 py-3 text-sm bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/20 transition-all placeholder:text-m3-on-surface-variant/40"
              />
            </div>

            {/* Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/20 transition-all appearance-none cursor-pointer"
              >
                <option value="">— Not set —</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/20 transition-all appearance-none cursor-pointer"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Estimated minutes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Estimated Duration (min)</label>
              <Input
                type="number" min={0}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="e.g. 480"
                className="text-sm"
              />
            </div>

            {/* Enrollment cap */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Enrollment Cap</label>
              <Input
                type="number" min={0}
                value={enrollmentCap}
                onChange={(e) => setEnrollmentCap(e.target.value)}
                placeholder="Leave empty for unlimited"
                className="text-sm"
              />
            </div>

            {/* Completion days */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Expected Completion (days)</label>
              <Input
                type="number" min={0}
                value={completionDays}
                onChange={(e) => setCompletionDays(e.target.value)}
                placeholder="e.g. 30"
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={updateCourse.isPending} className="gap-2 gradient-primary text-white border-0 shadow-sm">
              {updateCourse.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Course Settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function AddLessonPills({
  moduleId,
  courseId,
  nextPosition,
  itemCount,
}: {
  moduleId: string;
  courseId: string;
  nextPosition: number;
  itemCount: number;
}) {
  const navigate = useNavigate();
  const createLesson = useCreateLesson(moduleId, courseId);
  const createQuiz = useCreateQuiz(courseId);
  const [adding, setAdding] = useState(false);

  function slugify(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
    <div className="flex flex-wrap gap-2 mt-1 pt-2 border-t border-m3-outline-variant/10">
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

function ModuleItemRow({
  item, courseId, isDragOver, isDragging, onDragStart, onDragOver, onDrop, onDragEnd,
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
  const lesson = item.lesson;
  const quiz = item.quiz;
  const interview = item.interview;
  const lessonType = item.target?.lesson_type ?? lesson?.lesson_type ?? "video";
  const cfg = item.item_type === "lesson"
    ? (LESSON_TYPE_CONFIG[lessonType] ?? LESSON_TYPE_CONFIG["video"])
    : item.item_type === "quiz"
    ? QUIZ_ITEM_CONFIG
    : INTERVIEW_ITEM_CONFIG;
  const Icon = cfg?.icon ?? BookOpen;
  const rawLabel = cfg?.label ?? item.item_type;
  const label = item.item_type === "lesson"
    ? (cfg?.label ?? t("teacher_common.lesson_fallback"))
    : (rawLabel.startsWith("teacher_common.") ? t(rawLabel) : rawLabel);
  const title = item.target?.title ?? lesson?.title ?? quiz?.title ?? interview?.title ?? label;
  const status = lesson?.status ?? quiz?.status ?? interview?.status;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all group select-none cursor-grab active:cursor-grabbing",
        isDragging ? "opacity-40" : "",
        isDragOver
          ? "ring-2 ring-m3-primary/40 bg-m3-primary-fixed shadow-sm"
          : "bg-m3-surface hover:bg-m3-surface-container"
      )}
    >
      <GripVertical className="h-3.5 w-3.5 text-m3-outline-variant shrink-0" />
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", cfg?.badge ?? "bg-slate-50 text-slate-500")}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      {item.item_type === "lesson" && item.lesson_id ? (
        <Link
          to="/teacher/courses/$courseId/lessons/$lessonId"
          params={{ courseId, lessonId: item.lesson_id }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-xs font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer"
        >
          {title}
        </Link>
      ) : item.item_type === "quiz" && item.quiz_id ? (
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId, quizId: item.quiz_id }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-xs font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer"
        >
          {title}
        </Link>
      ) : item.item_type === "interview" && item.interview_config_id ? (
        <Link
          to="/teacher/courses/$courseId/interview-configs/$configId"
          params={{ courseId, configId: item.interview_config_id }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-xs font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer"
        >
          {title}
        </Link>
      ) : (
        <span className="flex-1 text-xs font-medium text-m3-on-surface truncate">
          {title}
        </span>
      )}
      <Badge className={cn("text-[10px] border-0 shrink-0", cfg?.badge ?? "bg-slate-100 text-slate-500")}>
        {label}
      </Badge>
      {status && (
        <Badge className={cn("text-[10px] border-0 shrink-0", status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700")}>
          {status}
        </Badge>
      )}
      <div className="flex items-center gap-1 text-m3-on-surface-variant">
        {item.item_type === "lesson" && item.lesson_id && (
          <Link
            to="/teacher/courses/$courseId/lessons/$lessonId"
            params={{ courseId, lessonId: item.lesson_id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-m3-on-surface">
              <Pencil className="h-3 w-3" />
            </Button>
          </Link>
        )}
        {item.item_type === "quiz" && item.quiz_id && (
          <Link
            to="/teacher/courses/$courseId/quizzes/$quizId"
            params={{ courseId, quizId: item.quiz_id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-m3-on-surface">
              <Pencil className="h-3 w-3" />
            </Button>
          </Link>
        )}
        {item.item_type === "interview" && item.interview_config_id && (
          <Link
            to="/teacher/courses/$courseId/interview-configs/$configId"
            params={{ courseId, configId: item.interview_config_id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-m3-on-surface">
              <Pencil className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function ModuleAccordion({
  module,
  courseId,
  defaultOpen = false,
}: {
  module: CourseContentModule;
  courseId: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(module.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const updateModule = useUpdateModule(module.id, courseId);
  const reorderItems = useReorderModuleItems(module.id, courseId);

  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const allItemsSorted = [...(module.items ?? [])].sort((a, b) => a.position - b.position);
  const lessonCount = (module.items ?? []).filter((i) => i.item_type === "lesson").length;
  const quizCount = (module.items ?? []).filter((i) => i.item_type === "quiz").length;
  const interviewCount = (module.items ?? []).filter((i) => i.item_type === "interview").length;

  function handleDrop(dropIdx: number) {
    if (dragSourceIdx === null || dragSourceIdx === dropIdx) {
      setDragSourceIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newOrder = [...allItemsSorted];
    const [moved] = newOrder.splice(dragSourceIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    const allIds = newOrder.map((item) => item.id);
    reorderItems.mutate(allIds, {
      onError: (err) => toast.error((err as Error).message || "Reorder failed"),
    });
    setDragSourceIdx(null);
    setDragOverIdx(null);
  }

  function startEditTitle(e: React.MouseEvent) {
    e.stopPropagation();
    setTitleDraft(module.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  function saveTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== module.title) {
      updateModule.mutate({ title: trimmed }, {
        onError: (err) => toast.error((err as Error).message),
      });
    }
  }

  function toggleStatus(e: React.MouseEvent) {
    e.stopPropagation();
    const next = module.status === "published" ? "draft" : "published";
    updateModule.mutate({ status: next }, {
      onSuccess: () => toast.success(`Module ${next}`),
      onError: (err) => toast.error((err as Error).message),
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border-l-4 overflow-hidden",
        open ? "border-m3-primary" : "border-m3-outline-variant"
      )}
    >
      {/* Header row */}
      <div
        className={cn(
          "w-full flex items-center gap-3 p-4 text-left transition-colors",
          open ? "bg-m3-surface-container-low" : "hover:bg-m3-surface-container-low/50"
        )}
      >
        <GripVertical className="h-4 w-4 text-m3-outline-variant shrink-0 cursor-grab" />

        {/* Title — editable inline */}
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(module.title); }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 font-headline font-semibold text-sm text-m3-on-surface bg-transparent border-b border-m3-secondary outline-none py-0.5"
          />
        ) : (
          <span
            className="flex-1 font-headline font-semibold text-sm text-m3-on-surface group"
            onClick={() => setOpen((o) => !o)}
          >
            {updateModule.isPending && updateModule.variables && "title" in updateModule.variables
              ? (updateModule.variables as { title?: string }).title ?? module.title
              : module.title}
          </span>
        )}

        <Link
          to="/teacher/courses/$courseId/modules/$moduleId"
          params={{ courseId, moduleId: module.id }}
          title="Edit module"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        >
          <Button variant="outline" size="sm" className="gap-1.5 h-7 px-2.5 text-xs border-m3-outline-variant/30">
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </Link>

        {/* Status badge — click to toggle */}
        <button
          type="button"
          title={`Click to mark as ${module.status === "published" ? "draft" : "published"}`}
          onClick={toggleStatus}
          disabled={updateModule.isPending}
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border-0 transition-colors cursor-pointer",
            module.status === "published"
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100"
          )}
        >
          {updateModule.isPending ? "…" : module.status}
        </button>

        {/* Meta counts */}
        <span className="text-[11px] text-m3-on-surface-variant hidden sm:block shrink-0">
          {lessonCount}L
          {quizCount > 0 && ` · ${quizCount}Q`}
          {interviewCount > 0 && ` · ${interviewCount}I`}
        </span>

        {/* Pencil to edit title */}
        <button
          type="button"
          title="Rename module"
          onClick={startEditTitle}
          className="shrink-0 p-1 rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary transition-colors"
        >
          {editingTitle ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
        </button>

        {/* Chevron expand */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-m3-on-surface-variant transition-transform" />
          ) : (
            <ChevronRight className="h-4 w-4 text-m3-on-surface-variant" />
          )}
        </button>
      </div>

      {open && (
        <div className="border-t border-m3-outline-variant bg-card">
          <div className="p-4 flex flex-col gap-1">
            {allItemsSorted.length === 0 && (
              <p className="text-xs text-m3-on-surface-variant py-2 pl-1">No items yet.</p>
            )}
            {allItemsSorted.map((item, idx) => (
              <ModuleItemRow
                key={item.id}
                item={item}
                courseId={courseId}
                isDragOver={dragOverIdx === idx}
                isDragging={dragSourceIdx === idx}
                onDragStart={(e) => {
                  setDragSourceIdx(idx);
                  const el = e.currentTarget as HTMLElement;
                  const rect = el.getBoundingClientRect();
                  e.dataTransfer.setDragImage(el, e.clientX - rect.left, e.clientY - rect.top);
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => { setDragSourceIdx(null); setDragOverIdx(null); }}
              />
            ))}
            <AddLessonPills
              moduleId={module.id}
              courseId={courseId}
              nextPosition={(module.items ?? []).length + 1}
              itemCount={(module.items ?? []).length}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AddModuleForm({
  courseId,
  nextPosition,
  onDone,
}: {
  courseId: string;
  nextPosition: number;
  onDone: () => void;
}) {
  const createModule = useCreateModule(courseId);
  const [title, setTitle] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createModule.mutateAsync({ title, position: nextPosition });
      toast.success("Module created");
      onDone();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to create module");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 bg-m3-surface-container rounded-xl">
      <Input
        autoFocus
        required
        placeholder="Module title (e.g. Foundations of ML)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1 text-sm"
      />
      <Button type="submit" size="sm" disabled={createModule.isPending}>
        {createModule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}

export default function CourseManagePage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const { data: course } = useTeacherCourseById(courseId);
  const { data: content, isLoading } = useTeacherCourseContent(courseId);
  const [addingModule, setAddingModule] = useState(false);

  const modules = content?.modules ?? [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/teacher/courses">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-m3-on-surface-variant mb-0.5">
            <Link to="/teacher/courses" className="hover:text-m3-primary transition-colors">
              {t("teacher_courses_list.title")}
            </Link>
            <ArrowRight className="h-3 w-3" />
            <span className="truncate">{course?.title ?? "…"}</span>
          </div>
          <h1 className="text-xl font-headline font-bold text-m3-on-surface truncate">
            {course?.title ?? "Curriculum Structure"}
          </h1>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {modules.length} module{modules.length !== 1 ? "s" : ""}
            {modules.length > 0 && (
              <> · {modules.reduce((acc, m) => acc + (m.items ?? []).filter(i => i.item_type === "lesson").length, 0)} lessons</>
            )}
          </p>
        </div>
        <Link to="/teacher/courses/$courseId/students" params={{ courseId }}>
          <Button variant="outline" size="sm" className="gap-2 border-m3-outline-variant/30 shrink-0">
            <Users className="h-4 w-4 text-m3-secondary" />
            <span className="hidden sm:inline">Students</span>
          </Button>
        </Link>
        <Link to="/teacher/courses/$courseId/progress" params={{ courseId }}>
          <Button variant="outline" size="sm" className="gap-2 border-m3-outline-variant/30 shrink-0">
            <Activity className="h-4 w-4 text-m3-secondary" />
            <span className="hidden sm:inline">Progress</span>
          </Button>
        </Link>
        <Link to="/management/courses/$courseId/enrollments" params={{ courseId }}>
          <Button variant="outline" size="sm" className="gap-2 border-m3-outline-variant/30 shrink-0">
            <UserPlus className="h-4 w-4 text-m3-secondary" />
            <span className="hidden sm:inline">Manage Enrollments</span>
          </Button>
        </Link>
      </div>

      {/* Course Settings */}
      <CourseSettingsPanel courseId={courseId} />

      {/* Curriculum */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-m3-surface-container animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((module, idx) => (
            <ModuleAccordion
              key={module.id}
              module={module}
              courseId={courseId}
              defaultOpen={idx === 0}
            />
          ))}

          {addingModule ? (
            <AddModuleForm
              courseId={courseId}
              nextPosition={modules.length + 1}
              onDone={() => setAddingModule(false)}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 text-sm"
              onClick={() => setAddingModule(true)}
            >
              <Plus className="h-4 w-4" />
              Add Module
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
