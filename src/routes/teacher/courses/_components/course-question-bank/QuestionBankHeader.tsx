import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/ui/page-header";
import type { CourseDetailData } from "./types";

/** Page title. The course shell already renders the breadcrumb back action. */
export function QuestionBankHeader({ course }: { course: CourseDetailData }) {
  const { t } = useTranslation();
  return (
    <PageHeader
      title={t("teacher_question_bank.title")}
      subtitle={
        course?.title
          ? t("teacher_question_bank.subtitle_course", {
              course: course.title,
            })
          : t("teacher_question_bank.subtitle")
      }
    />
  );
}
