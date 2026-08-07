import { useMemo } from "react";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useAddCareerPathCourse } from "@/lib/api/hooks/career-paths";
import { useCreateCourse } from "@/lib/api/hooks/teacher-courses";
import { useMe } from "@/lib/api/hooks/auth";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { CourseBasicsSection } from "./_components/management-course-new/BasicsSection";
import { CourseCardPreview } from "./_components/management-course-new/CardPreview";
import {
  CourseDetailsSection,
  CourseFormActions,
} from "./_components/management-course-new/DetailsSection";
import {
  slugify,
  useCourseForm,
} from "./_components/management-course-new/use-course-form";

export default function ManagementCourseNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const createCourse = useCreateCourse();
  // Optional career-path context, set when the manager arrived from a stage's
  // "New course" button. No cast needed — the route's `validateSearch` already
  // types both keys as optional strings.
  const { pathId, stageId } = useSearch({ strict: false });
  const attachToStage = useAddCareerPathCourse(pathId ?? "");

  // Course creation is a manager capability (backend gates POST /teacher/courses
  // on `course.create`, held by manager/admin only). Guard the screen so a user
  // without the permission is bounced instead of hitting a 403 on submit.
  const permissions = usePermissions();
  const canCreate = permissions.has("course.create");

  useRequirePermission(canCreate, {
    messageKey: "dept_courses.no_permission",
    redirectTo: "/dept",
  });

  const controller = useCourseForm(createCourse.isPending);
  const { form, canSubmit } = controller;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !canSubmit) return;

    try {
      const course = await createCourse.mutateAsync({
        title: form.title,
        slug: form.slug || slugify(form.title),
        description: form.description || undefined,
        level: (form.level || undefined) as
          | "beginner"
          | "intermediate"
          | "advanced"
          | undefined,
        estimated_minutes: form.estimated_minutes
          ? parseInt(form.estimated_minutes)
          : undefined,
      });
      toast.success(t("teacher_course_new.created"));

      // Came from a career-path stage: attach the new course there and go back
      // to the path. Without this the manager creates a course, lands on the
      // course page, and has to remember to go add it to the stage — the exact
      // omission the readiness checklist flags as "not on any career path".
      if (pathId && stageId) {
        try {
          await attachToStage.mutateAsync({
            stage_id: stageId,
            course_id: course.id,
            is_required: true,
          });
          await navigate({
            to: "/management/career-paths/$id",
            params: { id: pathId },
          });
          return;
        } catch (err: unknown) {
          // The course DID get created; only the attach failed. Say so
          // explicitly and still land on the course rather than implying the
          // whole thing failed and inviting a duplicate.
          toast.error(
            (err as Error).message ||
              t("teacher_course_new.attach_to_stage_failed"),
          );
        }
      }

      navigate({
        to: "/dept/courses/$courseId",
        params: { courseId: course.id },
      });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_course_new.create_failed"),
      );
    }
  }

  const levelOptions = useMemo(
    () =>
      (["beginner", "intermediate", "advanced"] as const).map((lvl) => ({
        key: lvl,
        label: t(`teacher_dashboard.level.${lvl}`, { defaultValue: lvl }),
      })),
    [t],
  );

  if (permissions.isLoading || !canCreate) {
    return null;
  }

  return (
    <div className="max-w-5xl space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("dept_courses.title"), to: "/dept" },
          { label: t("teacher_course_new.title") },
        ]}
      />

      <div className="flex items-center gap-3">
        <Link to="/dept">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-headline font-bold text-m3-primary">
          {t("teacher_course_new.title")}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="bg-card ghost-border shadow-editorial rounded-xl p-6 space-y-6"
        >
          {/* Section: Basics */}
          <CourseBasicsSection controller={controller} t={t} />

          {/* Section: Details */}
          <CourseDetailsSection
            controller={controller}
            t={t}
            levelOptions={levelOptions}
          />

          {/* Actions */}
          <CourseFormActions
            canSubmit={canSubmit}
            isPending={createCourse.isPending}
            t={t}
          />
        </form>

        <CourseCardPreview form={form} t={t} />
      </div>
    </div>
  );
}
