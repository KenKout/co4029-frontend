/**
 * "Advanced: fine-tune persona tone" — the optional per-trait persona override
 * panel of the Settings tab.
 *
 * Split out of `settings-form.tsx` (step 8 of the interview-config
 * decomposition). Its open/closed state moves with it: the panel is always
 * rendered inside the Basics card, so it never unmounts and the state survives
 * exactly as it did when the form owned it.
 */

import { useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { useTranslation } from "react-i18next";
import { ChevronDown, Lock, Sparkles } from "lucide-react";

import {
  PERSONA_TRAIT_KEYS,
  effectivePersonaTraits,
} from "@/lib/interview/config-draft";
import { isFieldFrozen } from "@/lib/interview/published-field-freeze";
import { cn } from "@/lib/utils";
import type { SettingsFieldsetProps } from "@/routes/teacher/_components/interview-config/settings-fieldset";

type PersonaTraitsPanelProps = Pick<
  SettingsFieldsetProps,
  "draft" | "update" | "status"
>;

export function PersonaTraitsPanel({
  draft,
  update,
  status,
}: PersonaTraitsPanelProps) {
  const { t } = useTranslation();
  const [personaAdvancedOpen, setPersonaAdvancedOpen] = useState(false);

  /* Advanced: optional per-trait persona overrides (Phase 3). Collapsed
     by default — the persona preset is enough for most teachers; the
     sliders let a power user fine-tune tone without a new persona. Every
     dial is TONE ONLY and never affects scoring (backend enforces this).
     An override exists only for a trait moved away from its preset.

     Base UI Collapsible rather than the hand-rolled grid-rows trick this
     used to share with the Security panel. Two reasons, both correctness
     rather than polish: the old version left the collapsed content in the
     DOM at opacity-0, so every slider inside stayed in the tab order and
     keyboard users landed on invisible controls; and it animated a grid
     track, which is a layout property recomputed every frame, against
     this file's own compositor-only convention. Collapsible unmounts the
     panel when closed and animates its height via a CSS variable. */
  return (
    <Collapsible.Root
      open={personaAdvancedOpen}
      onOpenChange={setPersonaAdvancedOpen}
      className={cn(
        "mt-4 block rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-4",
        isFieldFrozen("persona_profile", status) && "opacity-60",
      )}
    >
      <Collapsible.Trigger className="flex w-full cursor-pointer list-none items-center gap-3 text-left">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-m3-primary/10 text-m3-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-m3-on-surface">
            {t("teacher_interview_config.persona_traits.advanced_label")}
            {isFieldFrozen("persona_profile", status) && (
              <Lock
                className="ml-1.5 inline-block h-3 w-3 align-text-top"
                aria-hidden="true"
              />
            )}
          </span>
          <span className="block text-xs text-m3-on-surface-variant">
            {t("teacher_interview_config.persona_traits.help")}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-m3-on-surface-variant transition-transform duration-300 ${
            personaAdvancedOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </Collapsible.Trigger>

      <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-300 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
        <div>
          <div className="mt-5 space-y-4 border-t border-m3-outline-variant/20 pt-5">
            {(() => {
              const effective = effectivePersonaTraits(
                draft.persona,
                draft.persona_profile,
              );
              return PERSONA_TRAIT_KEYS.map((traitKey) => (
                <div key={traitKey} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`persona-trait-${traitKey}`}
                      className="text-xs font-medium text-m3-on-surface"
                    >
                      {t(
                        `teacher_interview_config.persona_traits.trait.${traitKey}`,
                      )}
                    </label>
                    <span className="text-xs tabular-nums text-m3-on-surface-variant">
                      {effective[traitKey]} / 4
                    </span>
                  </div>
                  <input
                    id={`persona-trait-${traitKey}`}
                    type="range"
                    min={0}
                    max={4}
                    step={1}
                    value={effective[traitKey]}
                    disabled={isFieldFrozen("persona_profile", status)}
                    onChange={(e) =>
                      update("persona_profile", {
                        ...draft.persona_profile,
                        [traitKey]: Number(e.target.value),
                      })
                    }
                    className="w-full cursor-pointer accent-m3-primary disabled:cursor-not-allowed"
                  />
                  <p className="text-[11px] text-m3-on-surface-variant">
                    {t(
                      `teacher_interview_config.persona_traits.trait_hint.${traitKey}`,
                    )}
                  </p>
                </div>
              ));
            })()}
            <button
              type="button"
              onClick={() => update("persona_profile", {})}
              disabled={isFieldFrozen("persona_profile", status)}
              className="text-xs font-medium text-m3-primary hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
            >
              {t("teacher_interview_config.persona_traits.reset")}
            </button>
          </div>
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
