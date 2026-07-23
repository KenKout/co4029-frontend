import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useMe } from "@/lib/api/hooks/auth";
import { sampleUser } from "@/test/msw-handlers";
import { createQueryWrapper } from "@/test/react-query-wrapper";

describe("useMe (sample)", () => {
  it("returns the MSW-mocked UserRead body", async () => {
    const storage = window.localStorage;
    const accessToken = "test-access-token";
    const refreshToken = "test-refresh-token";
    const expiresAt = String(Date.now() + 60_000);

    storage.setItem("abridgeai.access_token", accessToken);
    storage.setItem("abridgeai.refresh_token", refreshToken);
    storage.setItem("abridgeai.token_type", "bearer");
    storage.setItem("abridgeai.access_token_expires_at", expiresAt);
    storage.setItem("abridgeai.requires_mfa", "false");
    storage.setItem(
      "abridgeai.user",
      JSON.stringify({
        id: sampleUser.id,
        primary_email: sampleUser.primary_email,
        status: sampleUser.status,
        last_login_at: sampleUser.last_login_at ?? null,
        created_at: sampleUser.created_at,
        updated_at: sampleUser.updated_at,
        profile: null,
      }),
    );

    try {
      const { Wrapper } = createQueryWrapper();
      const { result } = renderHook(() => useMe(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.data).toBeTruthy());
      expect(result.current.data?.id).toBe(sampleUser.id);
      expect(result.current.data?.primary_email).toBe(sampleUser.primary_email);
    } finally {
      storage.clear();
    }
  });
});
