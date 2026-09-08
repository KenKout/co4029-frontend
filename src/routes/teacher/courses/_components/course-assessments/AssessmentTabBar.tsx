import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

import type { Tab } from "./types";
import type { CourseAssessmentsController } from "./use-course-assessments-controller";

/**
 * Quizzes / Interviews pill switch plus the free-text filter. Extracted verbatim
 * from the former 458-line course-assessments.tsx, including the title reset on
 * tab switch.
 */
export function AssessmentTabBar({
  controller,
}: {
  controller: CourseAssessmentsController;
}) {
  const { t } = useTranslation();
  const { tab, setTab, setTitleFilter, search, setSearch } = controller;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs<Tab>
        tabs={[
          { key: "quizzes", label: t("teacher_assessments.tabs.quizzes") },
          {
            key: "interviews",
            label: t("teacher_assessments.tabs.interviews"),
          },
        ]}
        value={tab}
        variant="contained"
        ariaLabel={t("teacher_assessments.type_label")}
        onChange={(key) => {
          setTab(key);
          setTitleFilter("all");
        }}
      />
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("teacher_assessments.search_placeholder")}
        className="max-w-xs h-9"
      />
    </div>
  );
}
