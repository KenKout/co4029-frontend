import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ── Mocks ────────────────────────────────────────────────────────────────
// useRequirePermission composes usePermissions (data), useNavigate (redirect),
// useTranslation (message), and sonner's toast. Mock all four so we can assert
// the guard's side effects without a router or query client.

const navigateMock = vi.fn();
const toastErrorMock = vi.fn();
let mockPermsState: { isLoading: boolean };

vi.mock("@/lib/api/hooks/auth", () => ({
  useMyPermissions: () => ({
    data: { permissions: [] },
    isLoading: mockPermsState.isLoading,
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));
const { useTranslationMock } = vi.hoisted(() => ({
  useTranslationMock: vi.fn(() => ({ t: (k: string) => k })),
}));
vi.mock("react-i18next", () => ({
  useTranslation: useTranslationMock,
}));
vi.mock("sonner", () => ({
  toast: { error: (...a: unknown[]) => toastErrorMock(...a) },
}));

import { useRequirePermission } from "@/lib/auth/use-permissions";

describe("useRequirePermission", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    toastErrorMock.mockClear();
    mockPermsState = { isLoading: false };
  });

  it("does nothing while permissions are loading", () => {
    mockPermsState = { isLoading: true };
    const { result } = renderHook(() =>
      useRequirePermission(false, { messageKey: "x.no_permission" }),
    );
    expect(navigateMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
    // allowed stays false while loading, isLoading true
    expect(result.current).toEqual({ isLoading: true, allowed: false });
  });

  it("redirects + toasts the given key when not allowed", () => {
    const { result } = renderHook(() =>
      useRequirePermission(false, { messageKey: "dept_courses.no_permission" }),
    );
    expect(toastErrorMock).toHaveBeenCalledWith("dept_courses.no_permission");
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/dashboard",
      replace: true,
    });
    expect(result.current.allowed).toBe(false);
  });

  it("honours a custom redirectTo", () => {
    renderHook(() =>
      useRequirePermission(false, {
        messageKey: "dept_courses.no_permission",
        redirectTo: "/dept",
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith({ to: "/dept", replace: true });
  });

  it("does not redirect when allowed, and reports allowed=true", () => {
    const { result } = renderHook(() =>
      useRequirePermission(true, { messageKey: "x.no_permission" }),
    );
    expect(navigateMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(result.current).toEqual({ isLoading: false, allowed: true });
  });

  it("uses the exact messageKey passed (guards against namespace drift)", () => {
    renderHook(() =>
      useRequirePermission(false, { messageKey: "common.no_permission" }),
    );
    expect(toastErrorMock).toHaveBeenCalledWith("common.no_permission");
    expect(toastErrorMock).not.toHaveBeenCalledWith(
      "admin.users.roles.errors.no_permission",
    );
  });

  it("toasts once even when the i18n t function changes identity (language hydrate)", () => {
    // AuthProvider calls i18n.changeLanguage() right after mount to hydrate
    // the saved profile locale; `t` then gets a new identity and the guard
    // effect re-runs. Without a ref guard that would fire a second toast in
    // the other language — the en+vi double-toast bug. The toast must stay
    // at exactly one while the user remains disallowed.
    let tFn: (k: string) => string = (k) => k;
    useTranslationMock.mockReturnValue({
      t: tFn,
    });
    const { rerender } = renderHook(() =>
      useRequirePermission(false, { messageKey: "x.no_permission" }),
    );
    expect(toastErrorMock).toHaveBeenCalledTimes(1);

    // Simulate i18n.changeLanguage(): new t identity, same disallowed state.
    tFn = (k: string) => `vi:${k}`;
    useTranslationMock.mockReturnValue({
      t: tFn,
    });
    rerender();
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).toHaveBeenCalledWith("x.no_permission");
  });
});
