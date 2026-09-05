import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * No mutation may invalidate both a key and a PREFIX of that key.
 *
 * React Query matches `invalidateQueries` by prefix, so
 * `["teacher","courses"]` already marks `["teacher","courses",courseId]` stale.
 * Four mutations listed both, and the observable symptom was that saving course
 * settings fired `GET /teacher/courses/{id}` TWICE — once per matching
 * invalidation.
 *
 * Asserted against the source text rather than by driving a QueryClient: the
 * defect is a redundant LINE, and a behavioural test would have to count network
 * calls through a mocked fetch to see it, which is a much heavier way to pin a
 * property that reads directly off the code.
 */

const HOOKS = resolve(__dirname, "..");

/** Files whose mutations touch the teacher course tree. */
const FILES = ["teacher-courses.ts", "courses.ts", "dept.ts"];

describe("teacher course invalidations", () => {
  it("never invalidates a key and its own prefix in the same handler", () => {
    const offenders: string[] = [];

    for (const file of FILES) {
      let src: string;
      try {
        src = readFileSync(resolve(HOOKS, file), "utf8");
      } catch {
        continue; // file is optional; the guard is about the ones that exist
      }

      // Each onSuccess/onSettled body, judged on its own.
      const handlers = src.split(/on(?:Success|Settled):/).slice(1);
      handlers.forEach((handler, index) => {
        const body = handler.slice(0, handler.indexOf("},\n"));
        const keys = [
          ...body.matchAll(/queryKey:\s*\[([^\]]*)\]/g),
        ].map((m) =>
          m[1]
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean),
        );

        for (const key of keys) {
          for (const other of keys) {
            if (key === other || other.length <= key.length) continue;
            const isPrefix = key.every((part, i) => part === other[i]);
            if (isPrefix) {
              offenders.push(
                `${file} handler #${index + 1}: [${key.join(", ")}] is a prefix of [${other.join(", ")}]`,
              );
            }
          }
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  it("still invalidates the teacher course tree at all", () => {
    // Guards the guard: if the invalidation were deleted outright the test above
    // would pass vacuously while the UI went stale after every save.
    const src = readFileSync(resolve(HOOKS, "teacher-courses.ts"), "utf8");
    expect(src).toContain('queryKey: ["teacher", "courses"]');
  });
});
