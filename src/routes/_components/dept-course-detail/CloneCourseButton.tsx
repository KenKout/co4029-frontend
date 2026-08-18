import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Copy, FileText, Layers, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCloneDeptCourse } from "@/lib/api/hooks/dept";
import type { CourseCloneDepth } from "@/lib/api/types";

/**
 * Manager-only course clone (``course.delete`` gate) with SELECTABLE DEPTH.
 *
 * Depth is chosen in the dialog BEFORE confirming — there is no default, so
 * the manager explicitly decides how much content to copy:
 *
 * * ``shell``     — course + learning outcomes only (no modules).
 * * ``structure`` — + the module skeleton (modules + module prerequisites).
 * * ``full``      — complete deep clone (modules + items + lessons + quizzes +
 *   interviews + resources, with every cross-reference re-wired to the copy).
 *
 * The clone is always a fresh draft owned by the manager. On success the SPA
 * navigates to the new course so the manager can rename/re-publish it.
 */
export function CloneCourseButton({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cloneCourse = useCloneDeptCourse();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [depth, setDepth] = useState<CourseCloneDepth | null>(null);

  async function runClone() {
    if (!depth) return;
    try {
      const created = await cloneCourse.mutateAsync({ courseId, depth });
      toast.success(t("dept_course_detail.clone.cloned", { title: courseTitle }));
      setConfirmOpen(false);
      setDepth(null);
      void navigate({
        to: "/dept/courses/$courseId",
        params: { courseId: created.id },
      });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("dept_course_detail.clone.failed"),
      );
      setConfirmOpen(false);
    }
  }

  const options: {
    value: CourseCloneDepth;
    icon: typeof FileText;
    label: string;
    desc: string;
  }[] = [
    {
      value: "shell",
      icon: FileText,
      label: t("dept_course_detail.clone.depth_shell"),
      desc: t("dept_course_detail.clone.depth_shell_desc"),
    },
    {
      value: "structure",
      icon: Layers,
      label: t("dept_course_detail.clone.depth_structure"),
      desc: t("dept_course_detail.clone.depth_structure_desc"),
    },
    {
      value: "full",
      icon: Package,
      label: t("dept_course_detail.clone.depth_full"),
      desc: t("dept_course_detail.clone.depth_full_desc"),
    },
  ];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={cloneCourse.isPending}
        className="shrink-0 gap-2 border-m3-primary/40 text-m3-primary transition-all hover:-translate-y-0.5 hover:bg-m3-primary hover:text-m3-on-primary hover:shadow-md active:translate-y-0 active:scale-95"
      >
        <Copy className="h-4 w-4" />
        {t("dept_course_detail.clone.button")}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setDepth(null);
        }}
        title={t("dept_course_detail.clone.title")}
        description={t("dept_course_detail.clone.body", { title: courseTitle })}
        confirmLabel={t("dept_course_detail.clone.confirm")}
        cancelLabel={t("common.cancel", "Cancel")}
        confirmVariant="default"
        onConfirm={runClone}
        isPending={cloneCourse.isPending}
        confirmDisabled={!depth}
        extraContent={
          <div className="space-y-2" role="radiogroup" aria-label={t("dept_course_detail.clone.title")}>
            {options.map((opt) => {
              const Icon = opt.icon;
              const selected = depth === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={cloneCourse.isPending}
                  onClick={() => setDepth(opt.value)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    selected
                      ? "border-m3-primary bg-m3-primary/5 ring-1 ring-m3-primary"
                      : "border-m3-outline-variant/50 hover:bg-m3-surface-container"
                  }`}
                >
                  <Icon
                    className={`mt-0.5 h-5 w-5 shrink-0 ${
                      selected ? "text-m3-primary" : "text-m3-on-surface-variant"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold text-text-strong">
                      {opt.label}
                      <span
                        className={`inline-block h-3 w-3 rounded-full border ${
                          selected
                            ? "border-m3-primary bg-m3-primary"
                            : "border-m3-outline-variant"
                        }`}
                      />
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
                      {opt.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        }
      />
    </>
  );
}