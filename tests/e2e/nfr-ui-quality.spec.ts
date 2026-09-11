import { test, expect, type Page } from "@playwright/test";
import { loginAs, type SeedRole } from "./_helpers/login";
import { resetSeed } from "./_helpers/seed-reset";

type RouteTarget = {
  label: string;
  path: string;
  role: SeedRole;
};

const ROUTES: RouteTarget[] = [
  { label: "student dashboard", path: "/dashboard", role: "student" },
  { label: "teacher courses", path: "/teacher/courses", role: "teacher" },
  { label: "admin statistics", path: "/admin/stats", role: "admin" },
];

const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 834, height: 1112 },
  { label: "mobile", width: 390, height: 844 },
] as const;

const PAGE_LOAD_BUDGET_MS = Number(
  process.env.NFR_PAGE_LOAD_BUDGET_MS ?? "3000",
);

async function openAuthenticatedRoute(
  page: Page,
  target: RouteTarget,
): Promise<void> {
  await loginAs(page, target.role);
  await page.goto(target.path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

test.describe("NFR UI quality", () => {
  test.beforeAll(async () => {
    await resetSeed();
  });

  for (const viewport of VIEWPORTS) {
    for (const target of ROUTES) {
      test(`${target.label} fits the ${viewport.label} viewport`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await openAuthenticatedRoute(page, target);

        const layout = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));

        expect(
          layout.scrollWidth,
          `${target.path} has horizontal page overflow at ${viewport.width}px`,
        ).toBeLessThanOrEqual(layout.clientWidth + 1);
      });
    }
  }

  for (const target of ROUTES) {
    test(`${target.label} meets the page-load budget`, async ({ page }) => {
      await loginAs(page, target.role);

      const startedAt = Date.now();
      await page.goto(target.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
      await page.waitForLoadState("networkidle").catch(() => undefined);
      const elapsedMs = Date.now() - startedAt;

      expect(
        elapsedMs,
        `${target.path} loaded in ${elapsedMs}ms; budget is ${PAGE_LOAD_BUDGET_MS}ms`,
      ).toBeLessThanOrEqual(PAGE_LOAD_BUDGET_MS);
    });

    test(`${target.label} exposes keyboard-reachable controls`, async ({
      page,
    }) => {
      await openAuthenticatedRoute(page, target);

      let reachedInteractiveControl = false;
      for (let press = 0; press < 20; press += 1) {
        await page.keyboard.press("Tab");
        reachedInteractiveControl = await page.evaluate(() => {
          const active = document.activeElement;
          if (!(active instanceof HTMLElement)) return false;
          return (
            active.matches("a[href], button, input, select, textarea") &&
            active.matches(":focus-visible")
          );
        });
        if (reachedInteractiveControl) break;
      }

      expect(
        reachedInteractiveControl,
        `${target.path} did not expose a visible keyboard focus target`,
      ).toBe(true);
    });
  }
});
