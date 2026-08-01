import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { GROUP_LABELS } from "./constants";
import type { ResolutionLayer, TFn } from "./types";

// Setting keys contain dots (e.g. "ai.llm_timeout_seconds"), which i18next
// treats as its nested-key separator. Flatten them to a dot-free token so the
// lookup resolves to a single leaf key rather than trying to walk a nested
// object that doesn't exist.
export function i18nKey(settingKey: string): string {
  return settingKey.replace(/\./g, "__");
}

export function settingLabel(t: TFn, setting: RuntimeSetting): string {
  return t(`admin_settings.item.${i18nKey(setting.key)}.label`, {
    defaultValue: setting.label,
  });
}

export function settingDescription(t: TFn, setting: RuntimeSetting): string {
  return t(`admin_settings.item.${i18nKey(setting.key)}.description`, {
    defaultValue: setting.description,
  });
}

export function groupLabel(t: TFn, group: string): string {
  return t(`admin_settings.group.${group}`, {
    defaultValue: GROUP_LABELS[group] ?? group,
  });
}

/** Derive a short unit suffix for a numeric field from its key. */
export function unitFor(setting: RuntimeSetting): string | null {
  const k = setting.key;
  if (k.endsWith("_seconds")) return "s";
  if (k.endsWith("_hours")) return "h";
  if (k.includes("tokens")) return "tok";
  if (k.endsWith("_dpi")) return "dpi";
  return null;
}

/**
 * The four resolution rungs in precedence order, each flagged `present` when
 * that layer actually carries a value. Hoisted out of ResolutionPopover so the
 * popover body is pure markup.
 */ export function resolutionLayers(
  setting: RuntimeSetting,
): ResolutionLayer[] {
  return [
    {
      source: "organization",
      name: "Organization override",
      value: setting.org_value,
      present: setting.org_value !== null,
    },
    {
      source: "global",
      name: "Global default",
      value: setting.global_value,
      present: setting.global_value !== null,
    },
    {
      source: "environment",
      name: "Environment variable",
      value: setting.env_value,
      present: setting.env_value !== null,
    },
    {
      source: "default",
      name: "Built-in default",
      value: setting.default_value,
      present: true,
    },
  ];
}

/**
 * Search predicate for the toolbar filter. Matches against the localised
 * label/description AND the backend English (via key fallback) so search works
 * whether the admin types Vietnamese or the original English term. An empty
 * query matches everything.
 */
export function matchesSearchQuery(
  t: TFn,
  s: RuntimeSetting,
  q: string,
): boolean {
  const localisedLabel = settingLabel(t, s).toLowerCase();
  const localisedDesc = settingDescription(t, s).toLowerCase();
  return (
    !q ||
    localisedLabel.includes(q) ||
    localisedDesc.includes(q) ||
    s.label.toLowerCase().includes(q) ||
    s.key.toLowerCase().includes(q) ||
    (s.env_var ?? "").toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q)
  );
}
