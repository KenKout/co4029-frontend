import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import type { CourseDetailData } from "./types";
import type { QuestionBankViewStateController } from "./use-question-bank-view-state";

/**
 * Page title + the "How it works" disclosure toggle, extracted verbatim from
 * the former 843-line course-question-bank.tsx. No back arrow: the course shell
 * already renders one next to the breadcrumb.
 */
export function QuestionBankHeader({
  course,
  view,
}: {
  course: CourseDetailData;
  view: QuestionBankViewStateController;
}) {
  const { t } = useTranslation();
  const { helpOpen, setHelpOpen } = view;
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
      action={
        <button
          type="button"
          onClick={() => setHelpOpen((open) => !open)}
          aria-expanded={helpOpen}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold",
            "transition-all duration-200 active:scale-[0.97]",
            helpOpen
              ? "bg-m3-primary-fixed text-m3-primary"
              : "text-m3-on-surface-variant hover:bg-m3-surface-container hover:text-m3-on-surface",
          )}
        >
          <Info className="h-3.5 w-3.5" />
          {t("teacher_question_bank.how_it_works")}
        </button>
      }
    />
  );
}
