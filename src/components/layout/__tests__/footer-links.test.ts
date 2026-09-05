import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The footer is the landing page's last impression on a signed-out visitor,
 * and it used to carry eight controls that did nothing: five `href="#"` text
 * links (Learning Paths, AI Assistant, Instructors, Help Center, Contact Us),
 * three unlabelled `href="#"` social icons, and a newsletter form with no
 * handler and no endpoint.
 *
 * `help-policy.test.tsx` already guards the links inside `Footer.tsx` itself,
 * which is exactly why these survived — they lived in the sibling column
 * components that nothing asserted on. This file closes that gap by reading
 * every file in the footer directory.
 *
 * Source-text assertions rather than a render: a dead anchor is a property of
 * what the component *writes*, and reading the source catches it in a column
 * that some future conditional stops rendering.
 */

const FOOTER_DIR = resolve(__dirname, "../footer");
const FOOTER_SRC = resolve(__dirname, "../Footer.tsx");

/**
 * Comments are stripped before matching. These files deliberately *describe*
 * the dead controls that were removed, so a naive source scan flags the very
 * documentation explaining the rule — and would punish the next person who
 * writes a comment about it.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function footerSources(): { name: string; src: string }[] {
  const files = readdirSync(FOOTER_DIR).filter((f) => f.endsWith(".tsx"));
  const out = files.map((name) => ({
    name: `footer/${name}`,
    src: readFileSync(resolve(FOOTER_DIR, name), "utf8"),
  }));
  out.push({ name: "Footer.tsx", src: readFileSync(FOOTER_SRC, "utf8") });
  return out.map(({ name, src }) => ({ name, src: stripComments(src) }));
}

describe("footer has no dead controls", () => {
  it("reads more than one source file", () => {
    // Guards the guard: a bad path would make every assertion below vacuous.
    expect(footerSources().length).toBeGreaterThan(1);
  });

  it('contains no href="#" anchors', () => {
    for (const { name, src } of footerSources()) {
      expect(src, `${name} must not contain a dead anchor`).not.toMatch(
        /href=["'`]#["'`]/,
      );
    }
  });

  it("declares no placeholder link helper", () => {
    for (const { name, src } of footerSources()) {
      expect(src, `${name} must not reintroduce a placeholder link`).not.toMatch(
        /PlaceholderLink/,
      );
    }
  });

  it("has no submit control without a handler", () => {
    // A button in the footer must either navigate (rendered as a Link) or
    // carry an onClick/onSubmit. The newsletter Subscribe button had neither.
    for (const { name, src } of footerSources()) {
      if (!/<Button/.test(src)) continue;
      expect(
        /onClick|onSubmit|render=/.test(src),
        `${name} renders a Button with no handler or destination`,
      ).toBe(true);
    }
  });

  it("keeps every anchor accessible", () => {
    // The social icons were `<a>` elements wrapping only an SVG: no text, no
    // aria-label, so screen readers announced an empty link.
    for (const { name, src } of footerSources()) {
      const bareIconAnchor = /<a\b[^>]*>\s*\{?\s*<[A-Z]\w*Icon\b/.test(src);
      expect(
        bareIconAnchor,
        `${name} has an icon-only anchor with no accessible name`,
      ).toBe(false);
    }
  });
});
