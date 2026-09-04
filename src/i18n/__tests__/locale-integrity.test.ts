import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural guards on the translation catalogues.
 *
 * Two classes of defect were invisible before this file existed:
 *
 * 1. DUPLICATE KEYS. JSON allows them and `JSON.parse` keeps the LAST one
 *    silently, so `nav.policies` appeared twice in both locales for a while and
 *    nothing complained. That is not merely untidy: any tool that parses and
 *    re-dumps the file (a codemod, a formatter, an agent adding a key) drops
 *    one of them, and if the two copies had ever diverged the surviving value
 *    would flip with no diff explaining why.
 *
 * 2. LOCALE DRIFT. A key added to en.json but not vi.json falls back to the
 *    English string at runtime, which reads as a rendering bug rather than a
 *    missing translation and gets found by a user instead of by CI.
 *
 * Both checks read the RAW TEXT for the duplicate scan (a parsed object cannot
 * show a duplicate — the evidence is already gone) and the parsed tree for
 * parity.
 */

const LOCALES = ["en", "vi"] as const;

function localePath(locale: string): string {
  return resolve(__dirname, `../locales/${locale}.json`);
}

function readRaw(locale: string): string {
  return readFileSync(localePath(locale), "utf8");
}

/** Every duplicated key path in one file, as `parent.child` strings. */
function duplicateKeyPaths(raw: string): string[] {
  const dups: string[] = [];
  const stack: { keys: Set<string>; name: string }[] = [];
  // A hand-rolled scan rather than a parser: we need the keys a parser throws
  // away. Tracks string literals so a brace or quote inside a translated value
  // ("Use { } carefully") cannot desynchronise the depth counter.
  let inString = false;
  let escaped = false;
  let literal = "";
  let lastKey: string | null = null;
  let expectingValue = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
        if (!expectingValue) lastKey = literal;
      } else {
        literal += ch;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      literal = "";
      continue;
    }
    if (ch === ":") {
      expectingValue = true;
      if (lastKey !== null && stack.length > 0) {
        const frame = stack[stack.length - 1];
        if (frame.keys.has(lastKey)) {
          dups.push(frame.name ? `${frame.name}.${lastKey}` : lastKey);
        } else {
          frame.keys.add(lastKey);
        }
      }
      continue;
    }
    if (ch === "{") {
      const parent = stack.length > 0 ? stack[stack.length - 1].name : "";
      const name = lastKey ? (parent ? `${parent}.${lastKey}` : lastKey) : parent;
      stack.push({ keys: new Set(), name });
      lastKey = null;
      expectingValue = false;
      continue;
    }
    if (ch === "}") {
      stack.pop();
      lastKey = null;
      expectingValue = false;
      continue;
    }
    if (ch === ",") {
      expectingValue = false;
      lastKey = null;
    }
  }
  return dups;
}

/** Flattened leaf key paths of a parsed catalogue. */
function leafPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    leafPaths(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("locale catalogues", () => {
  it.each(LOCALES)("%s.json is valid JSON", (locale) => {
    expect(() => JSON.parse(readRaw(locale)) as unknown).not.toThrow();
  });

  it.each(LOCALES)("%s.json has no duplicate keys", (locale) => {
    // A duplicate is silently survivable at runtime, which is exactly why it
    // has to fail here: `nav.policies` was doubled in both locales.
    expect(duplicateKeyPaths(readRaw(locale))).toEqual([]);
  });

  it("the duplicate scanner actually detects a duplicate", () => {
    // Guards the guard: a scanner that always returns [] would make the test
    // above pass forever.
    const doubled = '{ "nav": { "a": "1", "b": "2", "a": "3" } }';
    expect(duplicateKeyPaths(doubled)).toEqual(["nav.a"]);
  });

  it("the duplicate scanner ignores braces and quotes inside values", () => {
    const tricky = '{ "a": "use {{count}} and \\" here", "b": "{ }" }';
    expect(duplicateKeyPaths(tricky)).toEqual([]);
  });

  it("en and vi cover the same keys, ignoring plural variants", () => {
    // Plural SUFFIXES are excluded deliberately, not swept under the rug:
    // i18next resolves `key_one` / `key_other` from CLDR rules per language,
    // and Vietnamese has a single form. Requiring `_other` in vi.json would
    // demand entries the language does not use. The BASE key (the form without
    // the suffix) must still exist in both — that is what is asserted here, so
    // a genuinely untranslated string is still caught.
    const base = (k: string) =>
      k.replace(/_(zero|one|two|few|many|other|plural)$/, "");
    const en = new Set(
      leafPaths(JSON.parse(readRaw("en")) as unknown).map(base),
    );
    const vi = new Set(
      leafPaths(JSON.parse(readRaw("vi")) as unknown).map(base),
    );
    const missingFromVi = [...en].filter((k) => !vi.has(k)).sort();
    const missingFromEn = [...vi].filter((k) => !en.has(k)).sort();
    expect({ missingFromVi, missingFromEn }).toEqual({
      missingFromVi: [],
      missingFromEn: [],
    });
  });

  it("no key uses the i18next v3 `_plural` suffix", () => {
    // i18next v4+ (this project) expects `_other`. A `_plural` key is dead
    // weight the resolver never selects: `teacher_dashboard.health.days_ago_plural`
    // and `pass_sample_plural` existed in en.json only, so the call site had to
    // branch on count by hand to reach them.
    const offenders = LOCALES.flatMap((locale) =>
      leafPaths(JSON.parse(readRaw(locale)) as unknown)
        .filter((k) => k.endsWith("_plural"))
        .map((k) => `${locale}: ${k}`),
    );
    expect(offenders).toEqual([]);
  });
});
