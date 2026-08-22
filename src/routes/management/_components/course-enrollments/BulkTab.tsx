import { useTranslation } from "react-i18next";
import { BulkCsvCard } from "./BulkCsvCard";
import { BulkPasteForm } from "./BulkPasteForm";
import { BulkResultPanel } from "./BulkResultPanel";
import { useBulkTab } from "./use-bulk-tab";

/** Bulk tab: add many students at once by pasting a list or uploading a CSV. */
export function BulkTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const controller = useBulkTab(courseId, t);

  return (
    <div className="space-y-6">
      <BulkPasteForm controller={controller} />

      <BulkCsvCard controller={controller} />

      {controller.result && (
        <BulkResultPanel
          result={controller.result}
          onClose={() => controller.setResult(null)}
        />
      )}
    </div>
  );
}
