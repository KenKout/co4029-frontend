import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Field, SettingsSection } from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";

const K = "teacher_quiz_manage.settings.access";

/** One 1..N integer knob. Clamped on blur so the value the teacher sees is
 *  the value the server will accept — the DB CHECK would otherwise reject the
 *  whole save for a stray keystroke. */
function IntegrityNumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  min: number;
  max: number;
  onChange: (next: string) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const parsed = Number.parseInt(e.target.value, 10);
          if (Number.isNaN(parsed)) return;
          onChange(String(Math.min(max, Math.max(min, parsed))));
        }}
        className="w-full"
      />
    </Field>
  );
}

/**
 * Access section: password, subnet allowlist and proctoring sensitivity.
 *
 * (The browser-security switch was retired with migration 0114 — fullscreen
 * is now mandatory for every attempt, so there was nothing left for it to
 * toggle. What replaced it is the sensitivity block below: not whether an
 * attempt is proctored, which is no longer a choice, but how harshly the
 * signals it produces are weighed.)
 */
export function SettingsAccessSection({
  draft,
  update,
}: {
  draft: SettingsDraft;
  update: SettingsUpdate;
}) {
  const { t } = useTranslation();

  return (
    <SettingsSection
      title={t("teacher_quiz_manage.settings.access.title")}
      description={t("teacher_quiz_manage.settings.access.description")}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("teacher_quiz_manage.settings.access.password_label")}
          hint={t("teacher_quiz_manage.settings.access.password_hint")}
        >
          <Input
            type="password"
            autoComplete="new-password"
            value={draft.require_password}
            onChange={(e) => update("require_password", e.target.value)}
            className="w-full"
            placeholder={t(
              "teacher_quiz_manage.settings.access.password_placeholder",
            )}
          />
        </Field>
        <Field
          label={t("teacher_quiz_manage.settings.access.subnet_label")}
          hint={t("teacher_quiz_manage.settings.access.subnet_hint")}
        >
          <Input
            type="text"
            value={draft.require_subnet}
            onChange={(e) => update("require_subnet", e.target.value)}
            className="w-full"
            placeholder="10.0.0.0/8, 192.168.1.5"
          />
        </Field>
      </div>

      <div className="space-y-3 pt-2">
        <div>
          <h4 className="text-sm font-semibold text-m3-on-surface">
            {t(`${K}.integrity_title`)}
          </h4>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {t(`${K}.integrity_description`)}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <IntegrityNumberField
            label={t(`${K}.weight_tab_switch`)}
            hint={t(`${K}.weight_hint`)}
            value={draft.integrity_weight_tab_switch}
            min={1}
            max={5}
            onChange={(v) => update("integrity_weight_tab_switch", v)}
          />
          <IntegrityNumberField
            label={t(`${K}.weight_focus_lost`)}
            hint={t(`${K}.weight_hint`)}
            value={draft.integrity_weight_focus_lost}
            min={1}
            max={5}
            onChange={(v) => update("integrity_weight_focus_lost", v)}
          />
          <IntegrityNumberField
            label={t(`${K}.weight_fullscreen_exit`)}
            hint={t(`${K}.weight_hint`)}
            value={draft.integrity_weight_fullscreen_exit}
            min={1}
            max={5}
            onChange={(v) => update("integrity_weight_fullscreen_exit", v)}
          />
          <IntegrityNumberField
            label={t(`${K}.score_threshold`)}
            hint={t(`${K}.threshold_hint`)}
            value={draft.integrity_score_threshold}
            min={1}
            max={20}
            onChange={(v) => update("integrity_score_threshold", v)}
          />
        </div>
        <p className="text-xs text-m3-on-surface-variant">
          {t("teacher_quiz_manage.settings.assist.integrity_formula", {
            tab: draft.integrity_weight_tab_switch || "3",
            focus: draft.integrity_weight_focus_lost || "1",
            exit: draft.integrity_weight_fullscreen_exit || "2",
            threshold: draft.integrity_score_threshold || "3",
          })}
        </p>
        <p className="text-xs text-m3-on-surface-variant">
          {t(`${K}.frozen_note`)}
        </p>
      </div>
    </SettingsSection>
  );
}
