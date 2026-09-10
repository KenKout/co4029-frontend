import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { InterviewConfig } from "./use-course-interview";

/**
 * Pre-start disclosure of the browser-integrity policy (decision 2026-09-10).
 *
 * The three weights + threshold are the safe subset of the config the learner
 * is allowed to see — and the ONLY policy surface shown to them: they never
 * appear in the workspace or on the results screen, and rubric weights,
 * prompt-security categories and teacher reporting stay server-side. The
 * card's whole job is expectation-setting: "this is logged, this is what it
 * costs, one warning, the interview continues."
 */
export function InterviewIntegrityPolicyCard({
  config,
}: {
  config: InterviewConfig;
}) {
  const { t } = useTranslation();

  const rules = [
    {
      label: t("course_interview.integrity_policy_card.rule_tab_switch"),
      points: config.integrity_weight_tab_switch ?? 3,
    },
    {
      label: t("course_interview.integrity_policy_card.rule_focus_lost"),
      points: config.integrity_weight_focus_lost ?? 1,
    },
    {
      label: t("course_interview.integrity_policy_card.rule_fullscreen_exit"),
      points: config.integrity_weight_fullscreen_exit ?? 2,
    },
  ];
  const threshold = config.integrity_score_threshold ?? 3;

  return (
    <section
      aria-label={t("course_interview.integrity_policy_card.title")}
      className="mb-8 rounded-xl bg-m3-surface-container ghost-border p-4 text-left"
    >
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 shrink-0 text-m3-primary" aria-hidden="true" />
        <h2 className="text-sm font-extrabold text-m3-on-surface">
          {t("course_interview.integrity_policy_card.title")}
        </h2>
      </div>
      <p className="mt-1 text-xs text-m3-on-surface-variant">
        {t("course_interview.integrity_policy_card.description")}
      </p>
      <ul className="mt-3 space-y-1.5">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="text-m3-on-surface">{rule.label}</span>
            <span className="font-bold text-m3-on-surface">
              {t("course_interview.integrity_policy_card.points", {
                points: rule.points,
              })}
            </span>
          </li>
        ))}
        <li className="flex items-baseline justify-between gap-3 border-t border-m3-outline-variant/30 pt-1.5 text-sm">
          <span className="font-bold text-m3-on-surface">
            {t("course_interview.integrity_policy_card.rule_threshold")}
          </span>
          <span className="font-bold text-m3-on-surface">
            {t("course_interview.integrity_policy_card.points", {
              points: threshold,
            })}
          </span>
        </li>
      </ul>
      <p className="mt-3 text-[11px] text-m3-on-surface-variant">
        {t("course_interview.integrity_policy_card.behavior", {
          threshold,
        })}
      </p>
    </section>
  );
}
