import { test, expect } from "@playwright/test";
import { loginAs, setLocale } from "./_helpers/login";
import { resetSeed } from "./_helpers/seed-reset";

const ADMIN_STATS_SECTIONS = [
  "Tình trạng",
  "Cần xử lý",
  "Độ tin cậy",
  "Sử dụng & dung lượng",
  "Bảo mật",
] as const;

const SEEDED_USER_EMAILS = [
  "e2e-admin@example.com",
  "e2e-teacher@example.com",
  "e2e-student@example.com",
] as const;

const SEEDED_STUDENT_INITIALS = "ES";

test.describe("wave-1-smoke", () => {
  test.beforeAll(async () => {
    await resetSeed();
  });

  test("legacy health route opens the services operations tab", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/health");

    await expect(page).toHaveURL(/\/admin\/operations\?tab=services/);
    await expect(
      page.getByRole("heading", { name: /Vận hành & độ tin cậy/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Phụ thuộc" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("dashboard greets seeded student", async ({ page }) => {
    await loginAs(page, "student");
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { level: 1, name: /Chào mừng trở lại, E2E/i }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText(SEEDED_STUDENT_INITIALS, { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("admin stats overview exposes its five operational sections", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/stats");

    await expect(
      page.getByRole("heading", { name: /Tổng quan hệ thống/i }),
    ).toBeVisible({ timeout: 10_000 });

    for (const label of ADMIN_STATS_SECTIONS) {
      await expect(
        page.getByRole("button", { name: label, exact: true }),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("admin users list renders seeded rows", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/users");

    await expect(
      page.getByRole("heading", { name: /Quản lý người dùng/i }),
    ).toBeVisible({ timeout: 10_000 });

    await expect
      .poll(
        async () =>
          page
            .locator('[data-slot="table-body"] [data-slot="table-row"]')
            .count(),
        { timeout: 10_000 },
      )
      .toBeGreaterThanOrEqual(SEEDED_USER_EMAILS.length);

    for (const email of SEEDED_USER_EMAILS) {
      await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 });
    }
  });

  test("login page renders Google OAuth button", async ({ page }) => {
    await setLocale(page, "vi");
    await page.goto("/login");

    await expect(
      page.getByRole("button", { name: /Tiếp tục với Google/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
