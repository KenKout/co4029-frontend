/**
 * Section-nav status derivation for the interview-config tab bar.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). Pure read of existing state — no business logic added.
 * Settings is "completed" once the single required field (title) is present;
 * Learning Outcomes warns while empty; Generate reports how many questions
 * exist; Question Bank reports approved / total.
 *
 * The `useMemo` is load-bearing, not an optimisation: `TabBar` measures its
 * sliding indicator in a `useLayoutEffect` keyed on `items`, so a fresh array
 * every render would re-measure (and re-set state) on every render.
 */

import { useMemo } from "react";
import type { TFunction } from "i18next";

import type {
  SectionNavItem,
  SectionStatus,
} from "@/components/ui/section-nav";

export function useNavItems({
  t,
  settingsComplete,
  outcomeCount,
  draftCount,
  approvedCount,
}: {
  t: TFunction;
  settingsComplete: boolean;
  outcomeCount: number;
  draftCount: number;
  approvedCount: number;
}): SectionNavItem[] {
  return useMemo(() => {
    const settingsStatus: SectionStatus = settingsComplete
      ? {
          kind: "completed",
          label: t("teacher_interview_config.section_nav.status.completed"),
        }
      : {
          kind: "warning",
          label: t(
            "teacher_interview_config.section_nav.status.settings_incomplete",
          ),
        };

    const generateStatus: SectionStatus =
      draftCount > 0
        ? {
            kind: "info",
            label: t(
              "teacher_interview_config.section_nav.status.generated_count",
              {
                count: draftCount,
              },
            ),
          }
        : { kind: "none" };

    const questionsStatus: SectionStatus =
      draftCount > 0
        ? {
            kind: approvedCount === draftCount ? "completed" : "info",
            label: t(
              "teacher_interview_config.section_nav.status.approved_ratio",
              {
                approved: approvedCount,
                total: draftCount,
              },
            ),
          }
        : {
            kind: "warning",
            label: t(
              "teacher_interview_config.section_nav.status.no_questions",
            ),
          };

    return [
      {
        id: "settings",
        label: t("teacher_interview_config.section_nav.settings"),
        shortLabel: t("teacher_interview_config.section_nav.settings_short"),
        status: settingsStatus,
      },
      {
        id: "generate",
        label: t("teacher_interview_config.section_nav.generate"),
        shortLabel: t("teacher_interview_config.section_nav.generate_short"),
        status: generateStatus,
      },
      {
        id: "questions",
        label: t("teacher_interview_config.section_nav.questions"),
        shortLabel: t("teacher_interview_config.section_nav.questions_short"),
        status: questionsStatus,
      },
      {
        id: "adaptive-readiness",
        label: t("teacher_interview_config.section_nav.adaptive_readiness"),
        shortLabel: t(
          "teacher_interview_config.section_nav.adaptive_readiness_short",
        ),
        status: { kind: "none" },
      },
    ];
  }, [t, settingsComplete, outcomeCount, draftCount, approvedCount]);
}
