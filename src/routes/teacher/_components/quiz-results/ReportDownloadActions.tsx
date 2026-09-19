import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ReportDownloadActions({
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
