import { Tabs, type TabDef } from "@/components/ui/tabs";

import { RESULTS_TABS } from "./constants";
import type { ResultsTab } from "./types";
import type { QuizResultsController } from "./use-quiz-results-page";

/** Shared system tab component for the quiz-results sections. */
export function ResultsTabBar({
  controller,
}: {
  controller: QuizResultsController;
}) {
  const { t, tab, setTab } = controller;
  const tabs: TabDef<ResultsTab>[] = RESULTS_TABS.map(
    ({ id, icon, labelKey }) => ({
      key: id,
      icon,
      label: t(labelKey),
      labelHiddenOnMobile: true,
    }),
  );

  return (
    <Tabs
      tabs={tabs}
      value={tab}
      onChange={setTab}
      ariaLabel={t("teacher_quiz_results.tabs.aria_label")}
      className="w-full"
    />
  );
}
