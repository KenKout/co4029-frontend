/**
 * The Security & Integrity block of the Settings tab — the bottom-most panel,
 * collapsed by default.
 *
 * Split out of `settings-form.tsx` (step 8 of the interview-config
 * decomposition). Collapsible for the same reason as the persona panel: this one
 * holds a response-policy select, a max-attempts number and a custom refusal
 * textarea, all of which stayed tabbable while the section was closed. Its
 * open/closed state moves with it — the block is always rendered, so it never
 * unmounts and the state survives exactly as it did on the form.
 */

import { useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SecurityResponsePolicy } from "@/lib/interview/config-draft";
import {
  Field,
  ToggleRow,
} from "@/routes/teacher/_components/interview-config/form-primitives";
import type { SettingsFieldsetProps } from "@/routes/teacher/_components/interview-config/settings-fieldset";

const SELECTABLE_POLICIES: readonly SecurityResponsePolicy[] = [
  "continue_and_log",
  "warn_and_continue",
];

export function SettingsSecurityCard({
  draft,
  update,
  lock,
}: Omit<SettingsFieldsetProps, "status" | "frozenReason">) {
  const { t } = useTranslation();
  const [securityOpen, setSecurityOpen] = useState(false);

  return (
    <Collapsible.Root
      open={securityOpen}
      onOpenChange={setSecurityOpen}
      className="block rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-4"
    >
      <Collapsible.Trigger className="flex w-full cursor-pointer list-none items-center gap-3 text-left">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-m3-on-surface">
            {t("teacher_interview_config.security.title")}
          </span>
          <span className="block text-xs text-m3-on-surface-variant">
            {t("teacher_interview_config.security.description")}
          </span>
        </span>
        <span className="text-xs font-bold text-emerald-700">
          {t("teacher_interview_config.security.mandatory")}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-m3-on-surface-variant transition-transform duration-300 ${
            securityOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </Collapsible.Trigger>

      <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-300 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
        <div>
          <div className="mt-5 space-y-5 border-t border-m3-outline-variant/20 pt-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                {t("teacher_interview_config.security.protected_by_platform")}
              </p>
              <ul className="mt-2 grid gap-2 text-sm text-m3-on-surface sm:grid-cols-2">
                {["questions", "answers", "rubrics", "prompts", "state"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      {t(`teacher_interview_config.security.protected.${item}`)}
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("teacher_interview_config.security.response_policy")}
                {...lock("security_response_policy")}
              >
                <Select<SecurityResponsePolicy>
                  value={draft.security_response_policy}
                  onValueChange={(next) =>
                    update("security_response_policy", next)
                  }
                  placeholder={t(
                    "teacher_interview_config.security.policy.end_and_flag",
                  )}
                  options={SELECTABLE_POLICIES.map((policy) => ({
                    value: policy,
                    label: t(
                      `teacher_interview_config.security.policy.${policy}`,
                    ),
                  }))}
                />
              </Field>
              <Field
                label={t("teacher_interview_config.security.max_attempts")}
                {...lock("security_max_consecutive_attempts")}
              >
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={draft.security_max_consecutive_attempts}
                  onChange={(e) =>
                    update("security_max_consecutive_attempts", e.target.value)
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("teacher_interview_config.security.custom_en")}
                {...lock("security_custom_refusal_en")}
              >
                <Textarea
                  rows={3}
                  maxLength={500}
                  value={draft.security_custom_refusal_en}
                  onChange={(e) =>
                    update("security_custom_refusal_en", e.target.value)
                  }
                />
                <p className="mt-2 rounded-lg bg-m3-surface-container px-3 py-2 text-xs text-m3-on-surface-variant">
                  {draft.security_custom_refusal_en.trim() ||
                    t("teacher_interview_config.security.preview_en")}
                </p>
              </Field>
              <Field
                label={t("teacher_interview_config.security.custom_vi")}
                {...lock("security_custom_refusal_vi")}
              >
                <Textarea
                  rows={3}
                  maxLength={500}
                  value={draft.security_custom_refusal_vi}
                  onChange={(e) =>
                    update("security_custom_refusal_vi", e.target.value)
                  }
                />
                <p className="mt-2 rounded-lg bg-m3-surface-container px-3 py-2 text-xs text-m3-on-surface-variant">
                  {draft.security_custom_refusal_vi.trim() ||
                    t("teacher_interview_config.security.preview_vi")}
                </p>
              </Field>
            </div>
            <p className="text-[11px] text-m3-on-surface-variant">
              {t("teacher_interview_config.security.custom_scope_hint")}
            </p>

            <ToggleRow
              label={t("teacher_interview_config.security.incident_summary")}
              description={t(
                "teacher_interview_config.security.incident_summary_description",
              )}
              value={draft.security_incident_summary_enabled}
              onChange={(value) =>
                update("security_incident_summary_enabled", value)
              }
            />
            <p className="text-[11px] text-m3-on-surface-variant">
              {t("teacher_interview_config.security.rules_hidden")}
            </p>
          </div>
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
