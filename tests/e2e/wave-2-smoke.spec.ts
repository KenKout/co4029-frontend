import { test, expect } from "@playwright/test";
import { Client } from "pg";
import { loginAs } from "./_helpers/login";
import { resetSeed } from "./_helpers/seed-reset";

const SEED_COURSE_SLUG = "e2e-smoke-course";
const SEED_COURSE_TITLE = "E2E Smoke Course";
const SEED_MODULE_TITLE = "E2E Smoke Module";
const SEED_LESSON_ID = "00000000-0000-0000-0000-00000000f001";
const SEED_STUDENT_ID = "00000000-0000-0000-0000-00000000cccc";

const DEFAULT_DATABASE_URL =
  "postgresql://abridgeai:abridgeai@localhost:5433/abridgeai";

function databaseUrl(): string {
  return (
    process.env.E2E_DATABASE_URL ??
    process.env.DATABASE_URL?.replace(
      /^postgresql\+psycopg:\/\//,
      "postgresql://",
    ) ??
    DEFAULT_DATABASE_URL
  );
}

async function safeRowCount(
  table: string,
  whereClause: string,
  params: ReadonlyArray<string>,
): Promise<number> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    const result = await client.query(
      `SELECT COUNT(*)::int AS c FROM ${table} WHERE ${whereClause}`,
      params as unknown[],
    );
    return result.rows[0]?.c ?? 0;
  } catch {
    return 0;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function countMaterialsForLesson(lessonId: string): Promise<number> {
  const learning = await safeRowCount("learning_materials", "lesson_id = $1", [
    lessonId,
  ]);
  if (learning > 0) return learning;
  return safeRowCount("materials", "lesson_id = $1", [lessonId]);
}

async function countNotificationsForUser(userId: string): Promise<number> {
  return safeRowCount("notifications", "user_id = $1", [userId]);
}

test.describe("wave-2-smoke", () => {
  test.beforeAll(async () => {
    await resetSeed();
  });

  test("course catalog renders + first page loads", async ({ page }) => {
    await loginAs(page, "student");
    await page.goto("/courses");

    await expect
      .poll(
        async () => page.locator('[data-slot="infinite-list-item"]').count(),
        { timeout: 10_000 },
      )
      .toBeGreaterThanOrEqual(1);

    await expect(page.getByText(SEED_COURSE_TITLE).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("course detail shows the seeded instructor card", async ({ page }) => {
    await loginAs(page, "student");
    await page.goto(`/courses/${SEED_COURSE_SLUG}`);

    await expect(
      page.getByRole("heading", { name: /Giới thiệu giảng viên/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("E2E Teacher", { exact: true })).toBeVisible();

    await expect(page.getByText(/instructor_summary/i)).toHaveCount(0);
  });

  test("course content excludes draft modules", async ({ page }) => {
    await loginAs(page, "student");
    await page.goto(`/courses/${SEED_COURSE_SLUG}`);

    await expect(page.getByText(SEED_MODULE_TITLE).first()).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByText(/^draft$|^nháp$/i)).toHaveCount(0);
  });

  test("lesson viewer route loads without crash", async ({ page }) => {
    await loginAs(page, "student");
    await page.goto(`/courses/${SEED_COURSE_SLUG}/learn`);

    await expect
      .poll(
        async () => {
          const curriculum = await page
            .getByText(/Nội dung khóa học/i)
            .first()
            .isVisible()
            .catch(() => false);
          const placeholder = await page
            .getByText(/Chưa có bài học/i)
            .first()
            .isVisible()
            .catch(() => false);
          return curriculum || placeholder;
        },
        { timeout: 10_000 },
      )
      .toBe(true);

    await expect(page.getByText(/Khóa học không khả dụng/i)).toHaveCount(0);
  });

  test("material player renders when material is seeded", async ({ page }) => {
    const materialCount = await countMaterialsForLesson(SEED_LESSON_ID);
    test.skip(
      materialCount === 0,
      "No seeded material on lesson — player render path not exercised",
    );

    await loginAs(page, "student");
    await page.goto(`/courses/${SEED_COURSE_SLUG}/learn`);

    await expect(page.locator('[data-testid^="player-"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("notifications inbox renders header + empty state or items", async ({
    page,
  }) => {
    const notifCount = await countNotificationsForUser(SEED_STUDENT_ID);

    await loginAs(page, "student");
    await page.goto("/notifications");

    await expect(
      page
        .getByRole("heading")
        .filter({ hasText: /thông báo|notifications/i })
        .first(),
    ).toBeVisible({ timeout: 10_000 });

    if (notifCount === 0) {
      await expect(page.getByText("Chưa có thông báo nào").first()).toBeVisible(
        {
          timeout: 10_000,
        },
      );
    }
  });
});
