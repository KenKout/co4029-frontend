import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * A backend refusal must reach the user as its own sentence, not as JSON.
 *
 * `ApiError`'s `message` is built as `API ${status}: ${body}`, so
 *
 *   toast.error(error instanceof Error ? error.message : "fallback")
 *
 * always takes the first branch for an API failure and prints the raw body:
 *
 *   API 409: {"detail":{"error":"student_path_limit_reached", ... }}
 *
 * The `detail.message` inside it is the sentence the backend wrote for this
 * exact situation — "You already have 3 career paths in progress, and this
 * organization allows at most 3 at a time." `getApiErrorMessage` reads that
 * field; `error.message` cannot.
 *
 * Eight call sites had the bug at once, which is what makes it worth a
 * scanner rather than eight tests: it is the obvious thing to write, it type
 * checks, and it looks right in review. Only an actual 409 shows the
 * difference, and by then the toast has already been shown to a student.
 */

const SRC = resolve(__dirname, "../../..");

/**
 * `RouteErrorBoundary` is exempt on purpose. It catches render crashes rather
 * than API refusals and prints the raw text into a `<pre>` so the underlying
 * bug stays diagnosable — there, the full body is the point.
 */
const ALLOWED = new Set(["components/RouteErrorBoundary.tsx"]);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("API failures are shown as sentences, not raw bodies", () => {
  it("no source file reads .message off a caught error", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      if (ALLOWED.has(rel)) continue;
      const text = readFileSync(file, "utf8");
      // The shape of the bug: a caught value narrowed to Error purely so its
      // `.message` can be shown. Matches across line breaks, since prettier
      // splits the ternary as often as not.
      if (/error\s+instanceof\s+Error[\s\S]{0,80}?error\.message/.test(text)) {
        offenders.push(rel);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("the exemption still names a file that exists", () => {
    // An allow-list entry that no longer resolves would silently widen the
    // scan's blind spot rather than failing.
    for (const rel of ALLOWED) {
      expect(() => statSync(join(SRC, rel))).not.toThrow();
    }
  });
});
