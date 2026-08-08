import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  RESULTS_TABS,
  TAB_BUTTON_ACTIVE,
  TAB_BUTTON_BASE,
  TAB_BUTTON_IDLE,
} from "./constants";
import type { QuizResultsController } from "./use-quiz-results-page";

function ReportDownloadActions({
  downloading,
  onDownload,
}: {
  downloading: boolean;
  onDownload: (format: "csv" | "xlsx") => void;
}) {
  return (
    <div className="ml-auto flex items-center gap-1">
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

/** Seven-tab segmented bar, with the CSV / XLSX actions on report tabs. */
export function ResultsTabBar({
  controller,
}: {
  controller: QuizResultsController;
}) {
  const { t, tab, setTab, downloading, handleDownload } = controller;
  return (
    <div className="bg-m3-surface-container-low rounded-xl p-1 inline-flex gap-1 border border-m3-outline-variant/20">
      {RESULTS_TABS.map(({ id, icon: Icon, labelKey }) => (
        <Button variant="ghost"
          key={id}
          type="button"
          onClick={() => setTab(id)}
          aria-pressed={tab === id}
          className={cn(
            TAB_BUTTON_BASE,
            tab === id ? TAB_BUTTON_ACTIVE : TAB_BUTTON_IDLE,
          )}
        >
          <Icon className="h-4 w-4" />
          {t(labelKey)}
        </Button>
      ))}

      {(tab === "responses" || tab === "statistics") && (
        <ReportDownloadActions
          downloading={downloading}
          onDownload={(format) => void handleDownload(format)}
        />
      )}
    </div>
  );
}
