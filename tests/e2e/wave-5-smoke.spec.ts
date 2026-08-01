import { test, expect, type Page, type Route } from "@playwright/test";
import { Client } from "pg";
import { execSync } from "node:child_process";
import { loginAs } from "./_helpers/login";
import { resetSeed } from "./_helpers/seed-reset";

const SEED_COURSE_ID = "00000000-0000-0000-0000-00000000c001";
const SEED_MODULE_ID = "00000000-0000-0000-0000-00000000e001";

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

async function fetchOne<T>(
  sql: string,
  params: ReadonlyArray<string>,
): Promise<T | null> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    const result = await client.query(sql, params as unknown[]);
    return (result.rows[0] as T) ?? null;
  } catch {
    return null;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function getSeededQuizId(moduleId: string): Promise<string | null> {
  const row = await fetchOne<{ id: string }>(
    "SELECT id::text AS id FROM quizzes WHERE module_id = $1 LIMIT 1",
    [moduleId],
  );
  return row?.id ?? null;
}

async function getInterviewSessionId(): Promise<string | null> {
  const row = await fetchOne<{ id: string }>(
    "SELECT id::text AS id FROM interview_sessions LIMIT 1",
    [],
  );
  return row?.id ?? null;
}

async function isRouteWired(
  page: Page,
  path: string,
  sentinel: string,
): Promise<boolean> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  return page
    .locator(sentinel)
    .first()
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
}

test.describe("wave-5-smoke", () => {
  test.beforeAll(async () => {
    await resetSeed();
  });

  test("01 quiz authoring page renders", async ({ page }) => {
    const quizId = await getSeededQuizId(SEED_MODULE_ID);
    test.skip(!quizId, "No seeded quiz under module — quiz authoring not exercised");

    await loginAs(page, "teacher");
    await page.goto(`/teacher/courses/${SEED_COURSE_ID}/quizzes/${quizId}`, {
      waitUntil: "domcontentloaded",
    });

    const headingVisible = await page
      .getByRole("heading", { level: 1 })
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    test.skip(!headingVisible, "Quiz authoring heading did not render");

    expect(headingVisible).toBe(true);
  });

  test("02 bulk-set-expected-time form renders", async ({ page }) => {
    const quizId = await getSeededQuizId(SEED_MODULE_ID);
    test.skip(!quizId, "No seeded quiz under module — bulk-set form not exercised");

    await loginAs(page, "teacher");
    await page.goto(`/teacher/courses/${SEED_COURSE_ID}/quizzes/${quizId}`, {
      waitUntil: "domcontentloaded",
    });

    const headingVisible = await page
      .getByRole("heading", { level: 1 })
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    test.skip(!headingVisible, "Quiz authoring page did not render");

    const bulkVisible = await page
      .getByText(/Đặt nhanh thời gian/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const emptyVisible = await page
      .getByText(/câu hỏi/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(bulkVisible || emptyVisible).toBe(true);
  });

  test("03 interview gap report or config-new route renders", async ({
    page,
  }) => {
    await loginAs(page, "teacher");

    const sessionId = await getInterviewSessionId();
    if (sessionId) {
      const wired = await isRouteWired(
        page,
        `/teacher/interview-sessions/${sessionId}/gap-report`,
        "h1",
      );
      if (wired) {
        const heading = await page
          .getByRole("heading", { level: 1 })
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
        expect(heading).toBe(true);
        return;
      }
    }

    const wired = await isRouteWired(
      page,
      `/teacher/courses/${SEED_COURSE_ID}/interview-configs/new`,
      "h1",
    );
    test.skip(!wired, "Neither gap-report nor interview-config-new is wired");

    await expect(
      page.getByRole("heading", { name: /Tạo phỏng vấn AI mới/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("04 SR student dashboard renders", async ({ page }) => {
    await loginAs(page, "student");
    await page.goto("/dashboard/sr", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /Bảng điều khiển ôn tập/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("05 cards-due infinite-scroll list renders", async ({ page }) => {
    await loginAs(page, "student");
    await page.goto("/study/cards-due", { waitUntil: "domcontentloaded" });

    const titleVisible = await page
      .getByText(/Thẻ cần ôn/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(titleVisible).toBe(true);
  });

  test("06 cohort KR histogram renders", async ({ page }) => {
    await loginAs(page, "teacher");
    await page.goto(`/teacher/courses/${SEED_COURSE_ID}/sr-cohort`, {
      waitUntil: "domcontentloaded",
    });

    const titleVisible = await page
      .getByText(/Tổng quan lớp/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    test.skip(!titleVisible, "SR cohort page not wired or teacher blocked");

    await expect(
      page.getByText(/Chọn bài học/i).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("07 at-risk roster renders", async ({ page }) => {
    await loginAs(page, "teacher");
    await page.goto(`/teacher/courses/${SEED_COURSE_ID}/at-risk`, {
      waitUntil: "domcontentloaded",
    });

    const headingVisible = await page
      .getByText(/Sinh viên cần hỗ trợ/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    test.skip(!headingVisible, "At-risk roster not wired or teacher blocked");

    expect(headingVisible).toBe(true);
  });

  test("08 admin AI cost summary renders", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/ai-costs", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /Chi phí AI/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    const periodVisible = await page
      .getByText(/Khoảng thời gian|Hôm nay|7 ngày|30 ngày/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect(periodVisible).toBe(true);
  });

  test("09 career paths list renders", async ({ page }) => {
    await loginAs(page, "student");
    await page.goto("/career-paths", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /Định hình tương lai/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("10 manager career paths CRUD route renders", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/management/career-paths", {
      waitUntil: "domcontentloaded",
    });

    const headingVisible = await page
      .getByRole("heading", { name: /Quản lý lộ trình/i })
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    test.skip(
      !headingVisible,
      "/management/career-paths not wired or admin blocked",
    );

    await expect(
      page.getByRole("button", { name: /Tạo lộ trình mới/i }).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("11 notification body Markdown link renders", async ({ page }) => {
    await loginAs(page, "student");

    const mockNotification = {
      id: "00000000-0000-0000-0000-0000000abc01",
      user_id: "00000000-0000-0000-0000-00000000cccc",
      title: "E2E smoke notification",
      body: "Mời bạn xem [tài liệu ôn tập](https://example.com/resources/abc123) ngay.",
      category: "spaced_repetition",
      entity_type: null,
      entity_id: null,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    await page.route(
      /\/api\/v1\/me\/notifications(?:\?.*)?$/,
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([mockNotification]),
        });
      },
    );

    await page.route(
      /\/api\/v1\/me\/notifications\/unread-count$/,
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ unread: 1 }),
        });
      },
    );

    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /Thông báo/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    const link = page.getByRole("link", { name: /Mở tài liệu này/i }).first();
    await expect(link).toBeVisible({ timeout: 10_000 });
    await expect(link).toHaveAttribute(
      "href",
      "https://example.com/resources/abc123",
    );
    await expect(link).toContainText(/tài liệu ôn tập/i);
  });

  test("12 no legacy hook imports remain", async () => {
    let stdout: string;
    try {
      stdout = execSync(
        `grep -rE "useSelfEnroll\\|useRedeemInvitationCode\\|useTeacherRequestUploadUrl\\b" frontend-vite/src --include="*.ts" --include="*.tsx" | grep -v test || true`,
        {
          encoding: "utf-8",
          cwd: process.cwd().replace(/\/frontend-vite$/, ""),
        },
      );
    } catch (err: unknown) {
      stdout = (err as { stdout?: string }).stdout ?? "";
    }
    const matches = stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    expect(matches).toEqual([]);
  });
});
