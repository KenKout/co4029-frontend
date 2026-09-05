import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  adminNavGroups,
  adminNavItems,
  managerNavGroups,
  studentNavGroups,
  studentNavItems,
  teacherNavGroups,
  teacherNavItems,
  type NavGroup,
  type NavItem,
} from "@/lib/navigation";

/**
 * Every sidebar label must be translatable, and every key must exist in BOTH
 * catalogues.
 *
 * Two entries shipped without an `i18nKey` at all — the manager's "Learning
 * Programs" and the student's — so those single items stayed English on a
 * Vietnamese sidebar while every sibling translated. Nothing detected it:
 * `labelOf` falls back to the hard-coded English `label`, so the bug renders as
 * plausible text rather than a missing-key marker like `nav.foo`. That silent
 * fallback is exactly why this needs a test instead of review.
 *
 * The locale files are read as TEXT and parsed here rather than imported so a
 * duplicate key would still be caught by the sibling locale-integrity test; this
 * one only cares about presence.
 */

const LOCALES_DIR = resolve(__dirname, "../../i18n/locales");

function loadLocale(name: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(resolve(LOCALES_DIR, `${name}.json`), "utf8"),
  ) as Record<string, unknown>;
}

const en = loadLocale("en");
const vi = loadLocale("vi");

function lookup(catalogue: Record<string, unknown>, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      catalogue,
    );
}

const ALL_GROUPS: Array<[string, NavGroup[]]> = [
  ["student", studentNavGroups],
  ["teacher", teacherNavGroups],
  ["manager", managerNavGroups],
  ["admin", adminNavGroups],
];

const ALL_FLAT: Array<[string, NavItem[]]> = [
  ["student", studentNavItems],
  ["teacher", teacherNavItems],
  ["admin", adminNavItems],
];

/** Every nav item across every role, tagged with where it came from. */
function everyItem(): Array<{ role: string; item: NavItem }> {
  return [
    ...ALL_GROUPS.flatMap(([role, groups]) =>
      groups.flatMap((g) => g.items.map((item) => ({ role, item }))),
    ),
    ...ALL_FLAT.flatMap(([role, items]) =>
      items.map((item) => ({ role, item })),
    ),
  ];
}

describe("navigation i18n coverage", () => {
  it("gives every nav item an i18nKey", () => {
    const missing = everyItem()
      .filter(({ item }) => !item.i18nKey)
      .map(({ role, item }) => `${role}: ${item.label} (${String(item.href)})`);
    expect(missing).toEqual([]);
  });

  it("resolves every nav item key in English and Vietnamese", () => {
    const unresolved: string[] = [];
    for (const { role, item } of everyItem()) {
      if (!item.i18nKey) continue;
      if (typeof lookup(en, item.i18nKey) !== "string") {
        unresolved.push(`en missing ${item.i18nKey} (${role})`);
      }
      if (typeof lookup(vi, item.i18nKey) !== "string") {
        unresolved.push(`vi missing ${item.i18nKey} (${role})`);
      }
    }
    expect(unresolved).toEqual([]);
  });

  it("resolves every GROUP header key in English and Vietnamese", () => {
    const unresolved: string[] = [];
    for (const [role, groups] of ALL_GROUPS) {
      for (const group of groups) {
        if (typeof lookup(en, group.i18nKey) !== "string") {
          unresolved.push(`en missing ${group.i18nKey} (${role})`);
        }
        if (typeof lookup(vi, group.i18nKey) !== "string") {
          unresolved.push(`vi missing ${group.i18nKey} (${role})`);
        }
      }
    }
    expect(unresolved).toEqual([]);
  });

  it("does not leave a Vietnamese label identical to its English one", () => {
    // A copy-pasted English value is the other way this bug hides: the key
    // exists in vi.json so a presence check passes, but the sidebar still reads
    // English. Proper nouns are exempted — "AI" and "Dashboard" are used
    // verbatim in Vietnamese product copy here.
    const EXEMPT = new Set(["nav.ai_costs", "nav.dashboard"]);
    const untranslated = everyItem()
      .filter(({ item }) => item.i18nKey && !EXEMPT.has(item.i18nKey))
      .filter(({ item }) => {
        const e = lookup(en, item.i18nKey as string);
        const v = lookup(vi, item.i18nKey as string);
        return typeof e === "string" && e === v;
      })
      .map(({ item }) => item.i18nKey as string);
    expect([...new Set(untranslated)]).toEqual([]);
  });

  it("keeps the student and manager programme entries on distinct keys", () => {
    // Regression guard: /me/learning-programs is the student's enrolled
    // programmes, /management/learning-programs is the org-wide authoring
    // surface. One shared key would force one of the two to read wrongly.
    const student = studentNavGroups
      .flatMap((g) => g.items)
      .find((i) => i.href === "/me/learning-programs");
    const manager = managerNavGroups
      .flatMap((g) => g.items)
      .find((i) => i.href === "/management/learning-programs");

    expect(student?.i18nKey).toBe("nav.my_learning_programs");
    expect(manager?.i18nKey).toBe("nav.learning_programs");
    expect(student?.i18nKey).not.toBe(manager?.i18nKey);
  });
});
