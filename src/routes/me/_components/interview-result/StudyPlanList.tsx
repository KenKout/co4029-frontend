import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";
import type { StudyPlanItem } from "./types";

export default function StudyPlanList({
  studyPlan,
}: {
  studyPlan: StudyPlanItem[];
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-m3-outline">
        {t("course_interview.sections.study_plan")}
      </h3>
      <ul className="space-y-2">
        {studyPlan.map((item, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 rounded-xl bg-m3-surface-container-low p-3 text-sm"
          >
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-m3-primary shadow-sm">
              <BookOpen className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold text-m3-on-surface">
                {item.topic}
              </span>
              {item.suggested_resources.length > 0 && (
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {item.suggested_resources.map((res, ri) => (
                    <span
                      key={ri}
                      className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-m3-on-surface-variant"
                    >
                      {res}
                    </span>
                  ))}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
