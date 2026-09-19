import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, type TabDef } from "@/components/ui/tabs";

import { RESULTS_TABS } from "./constants";
import type { ResultsTab } from "./types";
import type { QuizResultsController } from "./use-quiz-results-page";

function ReportDownloadActions({
  downloading,
  onDownload,
}: {
  downloading: boolean;
  onDownload: (format: "csv" | "xlsx") => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={downloading}
        onClick={() => onDownload("csv")}
      >
        <Download className="h-4 w-4" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={downloading}
        onClick={() => onDownload("xlsx")}
      >
        <Download className="h-4 w-4" />
        XLSX
      </Button>
    </div>
  );
}

/** Shared system tab component plus server-side report export actions. */
export function ResultsTabBar({
  controller,
}: {
  controller: QuizResultsController;
}) {
  const { t, tab, setTab, downloading, handleDownload } = controller;
  const tabs: TabDef<ResultsTab>[] = RESULTS_TABS.map(({ id, icon, labelKey }) => ({
    key: id,
    icon,
    label: t(labelKey),
    labelHiddenOnMobile: true,
  }));
  const exportable = tab === "responses" || tab === "statistics";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Tabs
        tabs={tabs}
        value={tab}
        onChange={setTab}
        ariaLabel={t("teacher_quiz_results.tabs.aria_label")}
        className="min-w-0 flex-1"
      />
      {exportable && (
        <ReportDownloadActions
          downloading={downloading}
          onDownload={(format) => void handleDownload(format)}
        />
      )}
    </div>
  );
}
