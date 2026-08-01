import { useTranslation } from "react-i18next";
import { Mail, Users } from "lucide-react";
import type { RosterEntry } from "@/lib/api/types";

const ENROLLMENT_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-m3-primary-fixed text-m3-primary",
  dropped: "bg-slate-100 text-slate-500",
  pending: "bg-amber-100 text-amber-700",
};

export function StudentRow({ entry }: { entry: RosterEntry }) {
  const { t, i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  const cls = ENROLLMENT_COLOR[entry.status] ?? "bg-slate-100 text-slate-700";
  const label = t(`dept_course_detail.enrollment_status.${entry.status}`, {
    defaultValue: entry.status,
  });
  const enrolled = new Date(entry.enrolled_at).toLocaleDateString(locale);

  return (
    <div className="flex items-center gap-4 bg-surface-elev border border-border rounded-lg p-4 mb-2">
      <div className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center shrink-0">
        <Users className="h-4 w-4 text-text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-strong truncate">
          {entry.display_name || entry.primary_email}
        </p>
        <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
          <Mail className="h-3 w-3" />
          <span className="truncate">{entry.primary_email}</span>
        </p>
      </div>
      <div className="text-right shrink-0">
        <span
          className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${cls}`}
        >
          {label}
        </span>
        <p className="text-[11px] text-text-muted mt-1">
          {t("dept_course_detail.enrolled_at", { date: enrolled })}
        </p>
      </div>
    </div>
  );
}
