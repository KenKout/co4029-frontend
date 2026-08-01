import { useTranslation } from "react-i18next";
import { BookOpen, Plus } from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { CourseOrderList } from "./CourseOrderList";
import { CoursePickerDialog } from "./CoursePickerDialog";
import { EmptyState } from "./EmptyState";
import { SectionActionCard } from "./SectionActionCard";
import { useCoursesTab } from "./use-courses-tab";

/** Courses tab: attach catalogue courses to the path and order them. */
export function CoursesTab({ id }: { id: string }) {
  const { t } = useTranslation();
  const controller = useCoursesTab(id, t);

  if (controller.list.isLoading) {
    return (
      <PageSkeleton
        rows={2}
        height="h-14"
        rounded="rounded-lg"
        gap="space-y-2"
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionActionCard
        title={t("management_career_path_detail.sections.add_course")}
        hint={t("management_career_path_detail.sections.add_course_hint")}
        icon={Plus}
        actionLabel={t("management_career_path_detail.actions.add_courses")}
        onAction={() => controller.setPickerOpen(true)}
      />

      {controller.pickerOpen && <CoursePickerDialog controller={controller} />}

      {controller.rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          text={t("management_career_path_detail.empty_states.no_courses")}
        />
      ) : (
        <CourseOrderList pathId={id} controller={controller} />
      )}
    </div>
  );
}
