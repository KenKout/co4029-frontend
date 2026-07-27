import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The published knowledge map must be its OWN section on the reading lesson
 * page, not nested inside the "Reading" card.
 *
 * It used to be the last child of the reading GlassCard, so it read as part of
 * the reading material rather than as lesson-level concept information.
 *
 * Rendering ReadingLessonPane directly isn't practical here (it needs the
 * router, a query client, i18n and the material-stream hooks), so this asserts
 * the structural invariant against the source: <LessonKnowledgeMap> must sit
 * AFTER the reading card's closing tag, not between its open and close.
 */

const SRC = readFileSync(resolve(__dirname, "../course-learn.tsx"), "utf8");

describe("knowledge map placement on the reading lesson page", () => {
  it("renders outside the Reading card, not nested within it", () => {
    const cardOpen = SRC.indexOf('data-testid="course-learn-reading"');
    expect(cardOpen).toBeGreaterThan(-1);

    // The reading card's closing tag that follows its opening.
    const cardClose = SRC.indexOf("</GlassCard>", cardOpen);
    expect(cardClose).toBeGreaterThan(cardOpen);

    const mapUsage = SRC.indexOf("<LessonKnowledgeMap", cardOpen);
    expect(mapUsage).toBeGreaterThan(-1);

    // The invariant: the map comes after the card closes.
    expect(mapUsage).toBeGreaterThan(cardClose);
  });

  it("is still rendered on the reading pane at all", () => {
    // Guard against 'fixing' the nesting by deleting the map entirely.
    expect(SRC).toContain("<LessonKnowledgeMap lessonId={lesson.id} />");
  });

  it("wraps the two sections in a spaced container", () => {
    // Sibling sections need an explicit gap; without it they butt together.
    const ret = SRC.indexOf('<div className="space-y-6">');
    const cardOpen = SRC.indexOf('data-testid="course-learn-reading"');
    expect(ret).toBeGreaterThan(-1);
    expect(ret).toBeLessThan(cardOpen);
  });
});

describe("knowledge map card styling", () => {
  const MAP_SRC = readFileSync(
    resolve(__dirname, "../_components/LessonKnowledgeMap.tsx"),
    "utf8",
  );

  it("uses the shared card treatment now that it stands alone", () => {
    expect(MAP_SRC).toContain("glass ghost-border shadow-glass");
  });

  it("still self-hides when nothing is published", () => {
    // The section must not appear as an empty card on lessons with no graph.
    expect(MAP_SRC).toContain("if (!data || !data.published");
    expect(MAP_SRC).toContain("return null");
  });
});
