import { useTranslation } from "react-i18next";
import { FileSpreadsheet } from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import type { InvitationCodeAuthoring } from "@/lib/api/types";
import { CodeRow } from "./CodeRow";
import { LoadErrorBox } from "./LoadErrorBox";

/** Table of existing invitation codes, with its own loading/error/empty states. */
export function CodesList({
  courseId,
  codes,
  isLoading,
  isError,
  onEdit,
}: {
  courseId: string;
  codes: InvitationCodeAuthoring[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (item: InvitationCodeAuthoring) => void;
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <PageSkeleton
        rows={2}
        height="h-14"
        rounded="rounded-lg"
        gap="space-y-2"
      />
    );
  }

  if (isError) {
    return (
      <LoadErrorBox
        message={t("management_course_enrollments.errors.codes_load_failed")}
      />
    );
  }

  if (codes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-m3-on-surface-variant">
        <FileSpreadsheet className="h-8 w-8 opacity-30" />
        <p className="text-sm">
          {t("management_course_enrollments.codes.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1.5fr_120px_120px_120px_100px_140px] gap-4 px-5 py-3 border-b border-m3-outline-variant/10 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
        <span>{t("management_course_enrollments.codes.col_code")}</span>
        <span>{t("management_course_enrollments.roster.col_status")}</span>
        <span>{t("management_course_enrollments.codes.col_expires")}</span>
        <span>{t("management_course_enrollments.codes.col_uses")}</span>
        <span>{t("management_course_enrollments.codes.col_created")}</span>
        <span className="text-right">
          {t("management_course_enrollments.roster.col_actions")}
        </span>
      </div>
      <div className="divide-y divide-m3-outline-variant/10">
        {codes.map((c) => (
          <CodeRow
            key={c.id}
            courseId={courseId}
            item={c}
            onEdit={() => onEdit(c)}
          />
        ))}
      </div>
    </div>
  );
}
