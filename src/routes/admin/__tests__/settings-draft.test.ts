import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import {
  CLEAR,
  storedAtScope,
  useSettingsDraft,
} from "@/routes/admin/_components/settings/use-settings-draft";

/**
 * The staging layer that replaced auto-save (PRD ADM-030).
 *
 * What is worth pinning here is not that a Map holds values, but the two
 * judgements it encodes: what counts as "no change" at a given scope, and what
 * a staged clear should display. Both decide whether an operator is asked to
 * justify and apply something that does nothing.
 */

const ORG = "11111111-1111-1111-1111-111111111111";

function setting(over: Partial<RuntimeSetting> = {}): RuntimeSetting {
  return {
    key: "chunking.max_tokens",
    group: "chunking",
    type: "int",
    label: "Max tokens",
    description: "",
    env_var: null,
    minimum: null,
    maximum: null,
    requires_reprocess: true,
    default_value: 512,
    env_value: null,
    global_value: 800,
    org_value: null,
    effective_value: 800,
    source: "global",
    ...over,
  };
}

describe("storedAtScope", () => {
  it("reads the org slot for an org scope and the global slot otherwise", () => {
    const s = setting({ global_value: 800, org_value: 1200 });
    expect(storedAtScope(s, ORG)).toBe(1200);
    expect(storedAtScope(s, undefined)).toBe(800);
  });

  it("reports null when the value is only inherited", () => {
    // The org has no override of its own — 800 is the global's.
    expect(storedAtScope(setting(), ORG)).toBeNull();
  });
});

describe("useSettingsDraft", () => {
  it("starts clean", () => {
    const { result } = renderHook(() => useSettingsDraft());
    expect(result.current.isDirty).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it("stages a real change", () => {
    const { result } = renderHook(() => useSettingsDraft());
    act(() => result.current.stage(setting(), 900));
    expect(result.current.count).toBe(1);
    expect(result.current.isPending("chunking.max_tokens")).toBe(true);
  });

  it("does not stage a value identical to what is already stored", () => {
    // Typing the current number back is not a change. Staging it would ask the
    // operator to justify a no-op and put an empty entry in the audit trail.
    const { result } = renderHook(() => useSettingsDraft());
    act(() => result.current.stage(setting({ global_value: 800 }), 800));
    expect(result.current.isDirty).toBe(false);
  });

  it("drops a staged change when the value is edited back to the original", () => {
    const { result } = renderHook(() => useSettingsDraft());
    const s = setting({ global_value: 800 });
    act(() => result.current.stage(s, 900));
    expect(result.current.count).toBe(1);
    act(() => result.current.stage(s, 800));
    expect(result.current.count).toBe(0);
  });

  it("judges 'already stored' against the scope being edited", () => {
    // 800 is the GLOBAL value; for an org with no override of its own, setting
    // 800 creates a real override that pins the org even if the global moves.
    const { result } = renderHook(() => useSettingsDraft(ORG));
    act(() => result.current.stage(setting({ org_value: null }), 800));
    expect(result.current.isDirty).toBe(true);
  });

  it("does not stage a clear when nothing is overridden at this scope", () => {
    const { result } = renderHook(() => useSettingsDraft(ORG));
    act(() => result.current.stage(setting({ org_value: null }), CLEAR));
    expect(result.current.isDirty).toBe(false);
  });

  it("stages a clear when an override does exist", () => {
    const { result } = renderHook(() => useSettingsDraft(ORG));
    act(() => result.current.stage(setting({ org_value: 1200 }), CLEAR));
    expect(result.current.count).toBe(1);
  });

  it("shows what a staged clear would fall back to, not an empty value", () => {
    // Clearing an org override reveals the global. Showing a blank box instead
    // would hide the consequence the operator is about to apply.
    const { result } = renderHook(() => useSettingsDraft(ORG));
    const s = setting({ global_value: 800, org_value: 1200 });
    act(() => result.current.stage(s, CLEAR));
    expect(result.current.displayValue(s)).toBe(800);
  });

  it("falls through to the code default when clearing the last override", () => {
    const { result } = renderHook(() => useSettingsDraft());
    const s = setting({
      global_value: 800,
      env_value: null,
      default_value: 512,
    });
    act(() => result.current.stage(s, CLEAR));
    expect(result.current.displayValue(s)).toBe(512);
  });

  it("prefers the environment value over the code default", () => {
    const { result } = renderHook(() => useSettingsDraft());
    const s = setting({
      global_value: 800,
      env_value: 640,
      default_value: 512,
    });
    act(() => result.current.stage(s, CLEAR));
    expect(result.current.displayValue(s)).toBe(640);
  });

  it("shows the effective value when nothing is staged", () => {
    const { result } = renderHook(() => useSettingsDraft());
    expect(result.current.displayValue(setting())).toBe(800);
  });

  it("stages a false boolean rather than treating it as no edit", () => {
    // `false` is falsy; a truthiness check here would make "turn this off"
    // silently unstageable.
    const { result } = renderHook(() => useSettingsDraft());
    const s = setting({
      type: "bool",
      global_value: true,
      effective_value: true,
    });
    act(() => result.current.stage(s, false));
    expect(result.current.count).toBe(1);
    expect(result.current.displayValue(s)).toBe(false);
  });

  it("discards one change and all changes", () => {
    const { result } = renderHook(() => useSettingsDraft());
    act(() => {
      result.current.stage(setting({ key: "a" }), 900);
      result.current.stage(setting({ key: "b" }), 901);
    });
    expect(result.current.count).toBe(2);
    act(() => result.current.discard("a"));
    expect(result.current.count).toBe(1);
    act(() => result.current.discardAll());
    expect(result.current.count).toBe(0);
  });
});
