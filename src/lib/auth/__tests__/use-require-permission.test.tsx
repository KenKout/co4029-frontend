import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ── Mocks ────────────────────────────────────────────────────────────────
// useRequirePermission composes usePermissions only — it must NOT navigate,
// toast, or otherwise bounce the user (permission-violation URLs render
// <PermissionDenied /> in place instead). Mock the permission query alone.

let mockPermsState: { isLoading: boolean };

vi.mock("@/lib/api/hooks/auth", () => ({
  useMyPermissions: () => ({
    data: { permissions: [] },
    isLoading: mockPermsState.isLoading,
  }),
}));

import { useRequirePermission } from "@/lib/auth/use-permissions";

describe("useRequirePermission", () => {
  beforeEach(() => {
    mockPermsState = { isLoading: false };
  });

  it("reports loading and never allowed while permissions are loading", () => {
    mockPermsState = { isLoading: true };
    const { result } = renderHook(() => useRequirePermission(false));
    expect(result.current).toEqual({ isLoading: true, allowed: false });
  });

  it("reports denied (no redirect, no toast) when not allowed", () => {
    const { result } = renderHook(() => useRequirePermission(false));
    // The guard is pure state now: the caller renders <PermissionDenied />.
    expect(result.current).toEqual({ isLoading: false, allowed: false });
  });

  it("reports allowed when allowed", () => {
    const { result } = renderHook(() => useRequirePermission(true));
    expect(result.current).toEqual({ isLoading: false, allowed: true });
  });
});
