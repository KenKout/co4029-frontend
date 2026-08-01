import { useTranslation } from "react-i18next";
import type { MembershipRead } from "@/lib/api/types/admin-organizations";
import { formatDate } from "./helpers";

/**
 * Left-hand identity block of a membership row: the user id plus whichever of
 * the student / employee codes exist, and the join date.
 */
export function MembershipRowMeta({
  m,
  language,
}: {
  m: MembershipRead;
  language: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 flex-1">
      <p className="font-mono text-xs text-text-strong break-all">
        {m.user_id}
      </p>
      <div className="text-xs text-text-muted mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {m.student_code && (
          <span>
            {t("admin.organizations.fields.student_code")}:{" "}
            <span className="font-mono">{m.student_code}</span>
          </span>
        )}
        {m.employee_code && (
          <span>
            {t("admin.organizations.fields.employee_code")}:{" "}
            <span className="font-mono">{m.employee_code}</span>
          </span>
        )}
        <span>
          {t("admin.organizations.fields.joined_at")}:{" "}
          {formatDate(m.joined_at, language)}
        </span>
      </div>
    </div>
  );
}
