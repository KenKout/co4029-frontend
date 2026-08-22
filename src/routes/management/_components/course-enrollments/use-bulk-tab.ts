import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import {
  useBulkEnroll,
  useImportEnrollmentsCsv,
} from "@/lib/api/hooks/enrollments";
import type { BulkEnrollResult } from "@/lib/api/types";
import { parseBulkIdentifiers } from "./helpers";

/**
 * Everything stateful behind the bulk tab: the paste-and-enroll mutation, the
 * CSV import mutation, the textarea/file/result state and the parse of the
 * pasted lines.
 *
 * Hook calls are in the exact order `BulkTab` used to make them (bulk mutation
 * -> csv mutation -> local state -> parse memo), and `t` is injected so no extra
 * `useTranslation` is added.
 */
export function useBulkTab(courseId: string, t: TFunction) {
  const bulk = useBulkEnroll(courseId);
  const csv = useImportEnrollmentsCsv(courseId);
  const [text, setText] = useState("");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [result, setResult] = useState<BulkEnrollResult | null>(null);

  const parsed = useMemo(() => parseBulkIdentifiers(text), [text]);

  function reportImported(data: BulkEnrollResult) {
    setResult(data);
    toast.success(
      t("management_course_enrollments.toasts.bulk_added", {
        enrolled: data.enrolled.length,
        failures: data.failures.length,
      }),
    );
  }

  function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    if (parsed.userIds.length === 0 && parsed.emails.length === 0) {
      toast.error(
        t("management_course_enrollments.errors.bulk_input_required"),
      );
      return;
    }
    bulk.mutate(
      { user_ids: parsed.userIds, emails: parsed.emails },
      {
        onSuccess: (data) => {
          reportImported(data);
          setText("");
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_course_enrollments.toasts.bulk_failed"),
          ),
      },
    );
  }

  function handleCsvChange(file: File) {
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const csvText = String(reader.result ?? "");
      csv.mutate(
        { csv_text: csvText },
        {
          onSuccess: reportImported,
          onError: (err) =>
            toast.error(
              (err as Error).message ||
                t("management_course_enrollments.toasts.csv_failed"),
            ),
        },
      );
    };
    reader.onerror = () =>
      toast.error(t("management_course_enrollments.toasts.read_file_failed"));
    reader.readAsText(file);
  }

  const submitting = bulk.isPending || csv.isPending;

  return {
    bulk,
    csv,
    text,
    setText,
    csvFileName,
    result,
    setResult,
    parsed,
    submitting,
    handleSubmitText,
    handleCsvChange,
  };
}

export type BulkTabController = ReturnType<typeof useBulkTab>;
