import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { Select } from "@/components/ui/select";
import { InfoTooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type {
  CareerPathStageAuthoring,
  CareerPathStageEnforcement,
  CareerPathUnlockPolicy,
} from "@/lib/api/types";
import type { StagesTabController } from "./use-stages-tab";

/**
 * Settings panel for one stage.
 *
 * The unlock control is HIDDEN on the first stage (D5): position 1 is always
 * unlocked regardless of its stored policy, because a path whose first stage
 * is locked could never be started. The stored value is deliberately left
 * alone rather than normalised, so moving the stage away from position 1
 * restores the manager's original intent — that is why this hides the control
 * instead of forcing the value to `always`.
 */
export function StageSettingsPopover({
  stage,
  isFirst,
  controller,
}: {
  stage: CareerPathStageAuthoring;
  isFirst: boolean;
  controller: StagesTabController;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(stage.title ?? "");
  const [description, setDescription] = useState(stage.description ?? "");
  const [minOptional, setMinOptional] = useState(
    String(stage.min_optional_to_complete),
  );
  const [unlockPolicy, setUnlockPolicy] = useState<CareerPathUnlockPolicy>(
    stage.unlock_policy,
  );
  const [enforcement, setEnforcement] = useState<CareerPathStageEnforcement>(
    stage.enforcement,
  );

  const prefix = "management_career_path_detail.stages";
  const optionalCap = Math.max(
    0,
    stage.course_count - 0, // upper bound is enforced by the backend per stage
  );

  function submit() {
    const parsed = Number.parseInt(minOptional, 10);
    controller.handleUpdate(stage.id, {
      title: title.trim() === "" ? null : title.trim(),
      description: description.trim() === "" ? null : description.trim(),
      min_optional_to_complete: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
      // Only send the policy when the control was actually shown; posting it
      // for the first stage would silently rewrite a value the manager could
      // not see or edit.
      ...(isFirst ? {} : { unlock_policy: unlockPolicy }),
      enforcement,
    });
  }

  return (
    <div className="mt-3 p-4 rounded-xl bg-m3-surface-container-low ghost-border space-y-4">
      <StageIdentityFields
        stage={stage}
        title={title}
        onTitleChange={setTitle}
        minOptional={minOptional}
        onMinOptionalChange={setMinOptional}
        optionalCap={optionalCap}
        prefix={prefix}
        t={t}
      />

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-m3-on-surface-variant">
          {t(`${prefix}.fields.description`)}
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="rounded-xl px-3 py-2 text-sm bg-card ghost-border"
        />
      </label>

      {isFirst ? (
        // D5: no unlock control on the first stage — it is always open.
        <p className="text-xs text-m3-on-surface-variant flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {t(`${prefix}.unlock_policy.first_stage_note`)}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-m3-on-surface-variant">
            {t(`${prefix}.fields.unlock_policy`)}
          </span>
          <Select<CareerPathUnlockPolicy>
            value={unlockPolicy}
            onValueChange={setUnlockPolicy}
            options={[
              { value: "always", label: t(`${prefix}.unlock_policy.always`) },
              {
                value: "after_previous",
                label: t(`${prefix}.unlock_policy.after_previous`),
              },
              {
                value: "after_previous_required",
                label: t(`${prefix}.unlock_policy.after_previous_required`),
              },
            ]}
            aria-label={t(`${prefix}.fields.unlock_policy`)}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-m3-on-surface-variant flex items-center gap-1">
          {t(`${prefix}.fields.enforcement`)}
          <InfoTooltip
            content={t(`${prefix}.enforcement.hint`)}
            label={t(`${prefix}.enforcement.hint`)}
          />
        </span>
        <Select<CareerPathStageEnforcement>
          value={enforcement}
          onValueChange={setEnforcement}
          options={[
            { value: "hard", label: t(`${prefix}.enforcement.hard`) },
            { value: "soft", label: t(`${prefix}.enforcement.soft`) },
            { value: "advisory", label: t(`${prefix}.enforcement.advisory`) },
          ]}
          aria-label={t(`${prefix}.fields.enforcement`)}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button variant="ghost"
          type="button"
          onClick={submit}
          disabled={controller.update.isPending}
          className="h-9 px-4 rounded-full bg-m3-primary text-m3-on-primary text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          {t("common.save")}
        </Button>
        <Button variant="ghost"
          type="button"
          onClick={() => controller.setOpenSettingsFor(null)}
          className="h-9 px-4 rounded-full text-sm font-semibold text-m3-on-surface-variant hover:bg-m3-surface-container cursor-pointer"
        >
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

/** Stage name + optional-courses-to-finish fields (kept out of the popover
 *  to hold it under the 150-line function cap). The name placeholder echoes
 *  the stage's own position — "Leave empty to show 'Stage 2'" on stage 2,
 *  not a hard-coded "Stage 1". */
function StageIdentityFields({
  stage,
  title,
  onTitleChange,
  minOptional,
  onMinOptionalChange,
  optionalCap,
  prefix,
  t,
}: {
  stage: CareerPathStageAuthoring;
  title: string;
  onTitleChange: (v: string) => void;
  minOptional: string;
  onMinOptionalChange: (v: string) => void;
  optionalCap: number;
  prefix: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-m3-on-surface-variant">
          {t(`${prefix}.fields.title`)}
        </span>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t(`${prefix}.fields.title_placeholder`, {
            position: stage.position,
          })}
          maxLength={200}
          className="h-10 rounded-xl px-3 text-sm bg-card ghost-border"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-m3-on-surface-variant flex items-center gap-1">
          {t(`${prefix}.fields.min_optional`)}
          <InfoTooltip
            content={t(`${prefix}.fields.min_optional_hint`)}
            label={t(`${prefix}.fields.min_optional_hint`)}
          />
        </span>
        <input
          type="number"
          min={0}
          max={optionalCap || undefined}
          value={minOptional}
          onChange={(e) => onMinOptionalChange(e.target.value)}
          className="h-10 rounded-xl px-3 text-sm bg-card ghost-border"
        />
      </label>
    </div>
  );
}
