import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateDeptCourse } from "@/lib/api/hooks/dept";
import type { CourseAuthoring } from "@/lib/api/types";
import { DeleteCourseButton } from "./DeleteCourseButton";

/**
 * Dept course header: back link, inline-editable title + slug (manager-only),
 * and the manager-only delete button. Title/slug are course identity and were
 * moved off the teacher settings panel — only `course.delete` holders
 * (manager/admin) edit them here.
 */
export function DeptCourseHeader({
  course,
  courseId,
  canDelete,
}: {
  course: CourseAuthoring | undefined;
  courseId: string;
  canDelete: boolean;
}) {
  const { t } = useTranslation();
  const canEdit = canDelete && Boolean(course);
  const update = useUpdateDeptCourse(courseId);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(course?.title ?? "");
  const [slug, setSlug] = useState(course?.slug ?? "");

  // Re-seed the local buffers whenever a fresh course payload lands (after a
  // save the list query refetches and `course` gets new values).
  useEffect(() => {
    if (!editing) {
      setTitle(course?.title ?? "");
      setSlug(course?.slug ?? "");
    }
  }, [course, editing]);

  async function saveIdentity() {
    const nextTitle = title.trim();
    const nextSlug = slug.trim();
    if (!nextTitle) {
      toast.error(t("dept_course_detail.edit.title_required"));
      return;
    }
    if (!nextSlug) {
      toast.error(t("dept_course_detail.edit.slug_required"));
      return;
    }
    const changed: Record<string, string> = {};
    if (nextTitle !== course?.title) changed.title = nextTitle;
    if (nextSlug !== course?.slug) changed.slug = nextSlug;
    if (Object.keys(changed).length === 0) {
      setEditing(false);
      return;
    }
    try {
      await update.mutateAsync(changed);
      toast.success(t("dept_course_detail.edit.saved"));
      setEditing(false);
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("dept_course_detail.edit.save_failed"),
      );
    }
  }

  return (
    <div>
      <Link
        to="/dept"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-m3-primary transition-colors mb-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("dept_course_detail.back")}
      </Link>

      {canEdit && editing ? (
        <div className="space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label={t("dept_course_detail.edit.title_label")}
            className="max-w-xl"
          />
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            aria-label={t("dept_course_detail.edit.slug_label")}
            className="max-w-xl font-mono"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={saveIdentity}
              disabled={update.isPending}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" />
              {t("dept_course_detail.edit.save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={update.isPending}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              {t("dept_course_detail.edit.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="min-w-0 flex-1 text-2xl font-headline font-bold text-text-strong truncate">
              {course?.title ?? t("dept_course_detail.course_fallback")}
            </h1>
            {course?.slug && (
              <p className="text-sm text-text-muted mt-0.5 truncate">
                {course.slug}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
                className="gap-1.5 text-text-muted hover:text-m3-primary"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("dept_course_detail.edit.button")}
              </Button>
            )}
            {canDelete && course && (
              <DeleteCourseButton courseId={courseId} courseTitle={course.title} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
