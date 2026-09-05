import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiFetch: apiFetchMock,
}));

const { resolveLandingPath } = await import("../resolve-landing");

/**
 * `resolveLandingPath` decides where an authenticated user goes when they have
 * not asked for anywhere in particular — after login, and on "/".
 *
 * The two properties that matter are both about NOT trapping the user: an
 * explicit destination must survive, and a failure must never leave them
 * stranded.
 */
describe("resolveLandingPath", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("honours an explicit next over the role default", async () => {
    // Someone deep-linking to a page and getting bounced to /login must arrive
    // where they asked. Resolving their role instead would silently swallow it.
    apiFetchMock.mockResolvedValue(["admin"]);
    await expect(resolveLandingPath("/courses/abc")).resolves.toBe(
      "/courses/abc",
    );
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("rejects an off-site next and falls back to the role default", async () => {
    // "//evil.example" is protocol-relative: the browser treats it as another
    // origin, so honouring it would be an open redirect.
    apiFetchMock.mockResolvedValue(["teacher"]);
    await expect(resolveLandingPath("//evil.example")).resolves.toBe("/teacher");
    await expect(resolveLandingPath("https://evil.example")).resolves.toBe(
      "/teacher",
    );
  });

  it("resolves the role's landing page when there is no explicit next", async () => {
    apiFetchMock.mockResolvedValue(["manager"]);
    await expect(resolveLandingPath(null)).resolves.toBe("/management");
  });

  it("takes the highest role for a multi-role user", async () => {
    apiFetchMock.mockResolvedValue(["student", "teacher", "admin"]);
    await expect(resolveLandingPath(null)).resolves.toBe("/admin/stats");
  });

  it("falls back to /dashboard when the roles call fails", async () => {
    // A network blip must not strand anyone on the login screen or a blank
    // route. /dashboard is visible to every authenticated user.
    apiFetchMock.mockRejectedValue(new Error("network down"));
    await expect(resolveLandingPath(null)).resolves.toBe("/dashboard");
  });

  it("falls back to /dashboard when the user holds no known role", async () => {
    apiFetchMock.mockResolvedValue([]);
    await expect(resolveLandingPath(null)).resolves.toBe("/dashboard");
  });

  it("never resolves to '/'", async () => {
    // The root route redirects to whatever this returns; "/" would loop.
    for (const roles of [["admin"], ["hod"], ["manager"], ["teacher"], []]) {
      apiFetchMock.mockResolvedValue(roles);
      await expect(resolveLandingPath(null)).resolves.not.toBe("/");
    }
  });
});
