import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Export half of the import/export dialog: downloads the quiz's questions in
 * either Moodle format. Extracted from ImportExportPanel verbatim.
 */
export function QuizExportSection({
  exporting,
  onExport,
}: {
  exporting: boolean;
  onExport: (format: "gift" | "xml") => Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-m3-outline-variant/30 p-4 space-y-2">
      <p className="text-sm font-bold text-m3-on-surface">
        {t("teacher_quiz_manage.import_export.export_title")}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={exporting}
          onClick={() => void onExport("gift")}
        >
          <Download className="h-4 w-4" />
          GIFT
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={exporting}
          onClick={() => void onExport("xml")}
        >
          <Download className="h-4 w-4" />
          Moodle XML
        </Button>
      </div>
    </div>
  );
}
