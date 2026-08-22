import { useTranslation } from "react-i18next";
import { FileDropzone } from "@/components/ui/file-dropzone";
import type { BulkTabController } from "./use-bulk-tab";

/** The alternative CSV upload path for the same bulk-enroll endpoint. */
export function BulkCsvCard({ controller }: { controller: BulkTabController }) {
  const { t } = useTranslation();
  const { csv, csvFileName, submitting, handleCsvChange } = controller;

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-3">
      <h2 className="text-sm font-bold text-m3-on-surface">
        {t("management_course_enrollments.bulk.csv_or")}
      </h2>
      <p className="text-xs text-m3-on-surface-variant">
        {t("management_course_enrollments.bulk.csv_hint")}
      </p>
      <FileDropzone
        onFile={handleCsvChange}
        accept=".csv,text/csv"
        compact
        disabled={submitting}
        busy={csv.isPending}
        idleTitle={t("management_course_enrollments.bulk.choose_csv")}
        hint={csvFileName ?? undefined}
      />
    </div>
  );
}
