import { useTranslation } from "react-i18next";

/**
 * The roster table's column header, hidden on narrow screens exactly as before.
 * Extracted verbatim from the former 401-line course-progress.tsx.
 */
export function RosterProgressHeader() {
  const { t } = useTranslation();
  return (
    <div className="hidden sm:grid grid-cols-[1fr_120px_140px_120px_100px] gap-4 px-6 py-2.5 bg-m3-surface-container-low">
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_progress.cols.student")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_progress.cols.lessons")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_progress.cols.progress")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_progress.cols.time")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant text-right">
        {t("teacher_progress.cols.status")}
      </span>
    </div>
  );
}
