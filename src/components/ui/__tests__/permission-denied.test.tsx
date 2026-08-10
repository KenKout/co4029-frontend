import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const navigateMock = vi.fn();
const backMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));
const { useTranslationMock } = vi.hoisted(() => ({
  useTranslationMock: vi.fn(() => ({ t: (k: string) => k })),
}));
vi.mock("react-i18next", () => ({
  useTranslation: useTranslationMock,
}));

import { PermissionDenied } from "@/components/ui/permission-denied";

describe("PermissionDenied", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    backMock.mockClear();
    // Restore the real window.history between tests (jsdom keeps one entry).
    Object.defineProperty(window, "history", {
      configurable: true,
      value: {
        length: 1,
        back: backMock,
      },
    });
  });

  it("renders the 404 title, description and a back button", () => {
    render(<PermissionDenied />);
    expect(screen.getByText("permission_denied.title")).toBeTruthy();
    expect(screen.getByText("permission_denied.description")).toBeTruthy();
    expect(screen.getByText("permission_denied.back")).toBeTruthy();
    // The big 404 numeral marks it as a not-found-style page.
    expect(screen.getByText("404")).toBeTruthy();
  });

  it("goes back in history when there is a previous entry", () => {
    Object.defineProperty(window, "history", {
      configurable: true,
      value: { length: 3, back: backMock },
    });
    render(<PermissionDenied />);
    screen.getByText("permission_denied.back").click();
    expect(backMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("falls back to /dashboard when deep-linked (no history)", () => {
    render(<PermissionDenied />);
    screen.getByText("permission_denied.back").click();
    expect(backMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith({ to: "/dashboard" });
  });
});
