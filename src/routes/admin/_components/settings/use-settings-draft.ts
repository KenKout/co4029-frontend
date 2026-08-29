import { useCallback, useMemo, useState } from "react";

import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";

/**
 * Pending, unapplied edits to runtime settings.
 *
 * This hook is the whole point of the config-safety work (PRD ADM-030): before
 * it, toggling a switch wrote straight to the deployment, so "I was looking at
 * the form" and "I changed ingestion for every organization" were the same
 * gesture, with no reason recorded and no way back. Edits now accumulate here
 * and reach the server only through an explicit Apply.
 *
 * A pending edit is either a new value or the sentinel {@link CLEAR}, meaning
 * "remove the override at this scope and inherit again". `null` is deliberately
 * not used for that: `null` is a legitimate absence in the API's own payloads,
 * and conflating the two is what makes a clear indistinguishable from a set in
 * an audit trail.
 */

/** Sentinel for "remove the override at this scope". */
export const CLEAR = Symbol("clear-override");

export type PendingValue = boolean | number | typeof CLEAR;

export interface PendingChange {
  key: string;
  value: PendingValue;
}

/** The value stored AT THIS SCOPE, or null when the setting is inherited. */
export function storedAtScope(
  setting: RuntimeSetting,
  orgId?: string,
): boolean | number | null {
  return orgId !== undefined ? setting.org_value : setting.global_value;
}

export function useSettingsDraft(orgId?: string) {
  const [pending, setPending] = useState<Map<string, PendingValue>>(new Map());

  /**
   * Stage an edit, or drop it when it matches what is already stored.
   *
   * The second half matters: typing 800, then typing 900, then typing 800
   * again should leave nothing pending. Without it the operator is asked to
   * justify and apply a change that does nothing, and the audit trail fills
   * with no-op entries that make the real ones harder to find.
   */
  const stage = useCallback(
    (setting: RuntimeSetting, value: PendingValue) => {
      setPending((prev) => {
        const next = new Map(prev);
        const stored = storedAtScope(setting, orgId);
        const isNoop = value === CLEAR ? stored === null : stored === value;
        if (isNoop) next.delete(setting.key);
        else next.set(setting.key, value);
        return next;
      });
    },
    [orgId],
  );

  const discard = useCallback((key: string) => {
    setPending((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const discardAll = useCallback(() => setPending(new Map()), []);

  /**
   * What a control should render: the pending edit if there is one, otherwise
   * the effective value. A staged CLEAR shows the value that would be
   * inherited, so the operator sees the consequence rather than an empty box.
   */
  const displayValue = useCallback(
    (setting: RuntimeSetting): boolean | number => {
      const staged = pending.get(setting.key);
      if (staged === undefined) return setting.effective_value;
      if (staged === CLEAR) {
        // Next level down: global (when clearing an org row), then env, then
        // the code default.
        if (orgId !== undefined && setting.global_value !== null) {
          return setting.global_value;
        }
        return setting.env_value ?? setting.default_value;
      }
      return staged;
    },
    [pending, orgId],
  );

  const changes = useMemo<PendingChange[]>(
    () => [...pending.entries()].map(([key, value]) => ({ key, value })),
    [pending],
  );

  return {
    pending,
    changes,
    count: pending.size,
    isDirty: pending.size > 0,
    isPending: (key: string) => pending.has(key),
    stage,
    discard,
    discardAll,
    displayValue,
  };
}

export type SettingsDraft = ReturnType<typeof useSettingsDraft>;
