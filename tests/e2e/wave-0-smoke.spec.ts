import { test, expect } from "@playwright/test";
import { loginAs } from "./_helpers/login";
import { resetSeed } from "./_helpers/seed-reset";

test.describe("wave-0-smoke", () => {
  test.beforeAll(async () => {
    await resetSeed();
  });

  test("admin reaches its role landing after programmatic login", async ({
    page,
  }) => {
    await loginAs(page, "admin");

    await page.goto("/admin/stats");

    await expect(page).toHaveURL(/\/admin\/stats/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Tổng quan hệ thống/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
