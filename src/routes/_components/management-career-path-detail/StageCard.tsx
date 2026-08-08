import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Lock, Settings, Unlock } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type {
  CareerPathCourseAuthoring,
  CareerPathStageAuthoring,
} from "@/lib/api/types";
import { RemoveRowButtons } from "./RemoveRowButtons";
import { StageSettingsPopover } from "./StageSettingsPopover";
import type { StagesTabController } from "./use-stages-tab";

/**
 * One stage: header (position, name, course count, gating summary), the gear
 * that opens its settings, reorder arrows, delete, and the courses inside it.
 *
 * The first stage renders an "always open" affordance rather than its stored
 * policy, matching the backend's implicit override (D5).
 */
export function StageCard({
  stage,
  index,
  total,
  courses,
  controller,
  children,
}: {
  stage: CareerPathStageAuthoring;
  index: number;
  total: number;
  courses: CareerPathCourseAuthoring[];
  controller: StagesTabController;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const prefix = "management_career_path_detail.stages";
  const isFirst = index === 0;
  const open = controller.openSettingsFor === stage.id;

  const policyLabel = isFirst
    ? t(`${prefix}.unlock_policy.always`)
    : t(`${prefix}.unlock_policy.${stage.unlock_policy}`);

  return (
    <div className="rounded-2xl bg-card ghost-border p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-0.5 shrink-0">
          <Button variant="ghost"
            type="button"
            onClick={() => controller.move(index, -1)}
            disabled={isFirst}
            className="p-1 rounded hover:bg-m3-surface-container disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title={t(`${prefix}.move_up`)}
          >
            <ArrowUp className="h-3 w-3 text-m3-on-surface-variant" />
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={() => controller.move(index, 1)}
            disabled={index === total - 1}
            className="p-1 rounded hover:bg-m3-surface-container disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title={t(`${prefix}.move_down`)}
          >
            <ArrowDown className="h-3 w-3 text-m3-on-surface-variant" />
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-m3-primary-fixed text-m3-primary shrink-0 font-headline font-bold text-xs">
          {stage.position}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-m3-on-surface truncate">
            {controller.stageLabel(stage)}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
            <span className="text-[11px] text-m3-on-surface-variant">
              {t(`${prefix}.course_count`, { count: courses.length })}
            </span>
            <span className="text-[11px] text-m3-on-surface-variant flex items-center gap-1">
              {isFirst || stage.unlock_policy === "always" ? (
                <Unlock className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              {policyLabel}
            </span>
            {stage.min_optional_to_complete > 0 && (
              <span className="text-[11px] text-m3-on-surface-variant">
                {t(`${prefix}.fields.min_optional`)}:{" "}
                {stage.min_optional_to_complete}
              </span>
            )}
          </div>
          {stage.description && (
            <p className="text-[11px] text-m3-on-surface-variant mt-1 line-clamp-2">
              {stage.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Tooltip content={t(`${prefix}.settings`)}>
            <Button variant="ghost"
              type="button"
              onClick={() =>
                controller.setOpenSettingsFor(open ? null : stage.id)
              }
              aria-label={t(`${prefix}.settings`)}
              className="p-2 rounded-lg hover:bg-m3-surface-container cursor-pointer"
            >
              <Settings className="h-4 w-4 text-m3-on-surface-variant" />
            </Button>
          </Tooltip>
          <RemoveRowButtons
            confirming={confirming}
            isPending={controller.remove.isPending}
            confirmLabel={t("common.confirm")}
            cancelLabel={t("common.cancel")}
            onStartConfirm={() => setConfirming(true)}
            onCancel={() => setConfirming(false)}
            onRemove={() => {
              controller.handleDelete(stage.id);
              setConfirming(false);
            }}
            wrapperClassName="flex gap-1"
            triggerClassName="text-red-600 hover:text-red-700"
          />
        </div>
      </div>

      {open && (
        <StageSettingsPopover
          stage={stage}
          isFirst={isFirst}
          controller={controller}
        />
      )}

      <div className="mt-3 space-y-2">
        {courses.length === 0 ? (
          <p className="text-xs text-m3-on-surface-variant italic px-1">
            {t(`${prefix}.empty_stage`)}
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
