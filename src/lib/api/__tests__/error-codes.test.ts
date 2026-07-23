import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/client";
import { getApiErrorCode, isApiErrorCode } from "@/lib/api/error-codes";

function makeApiError(body: unknown, status = 429): ApiError {
  return new ApiError(status, JSON.stringify(body), "Too Many Requests");
}

describe("error-codes", () => {
  it("isApiErrorCode returns true for matching body.detail.error", () => {
    const err = makeApiError({
      detail: {
        error: "card_cooldown_active",
        question_id: "q-1",
        retry_available_at: "2026-01-01T00:00:00Z",
      },
    });

    expect(isApiErrorCode(err, "card_cooldown_active")).toBe(true);
    expect(isApiErrorCode(err, "permission_denied")).toBe(false);
  });

  it("isApiErrorCode returns false for non-ApiError objects", () => {
    expect(isApiErrorCode(new Error("oops"), "card_cooldown_active")).toBe(
      false,
    );
    expect(isApiErrorCode(null, "card_cooldown_active")).toBe(false);
    expect(
      isApiErrorCode(
        { detail: { error: "card_cooldown_active" } },
        "card_cooldown_active",
      ),
    ).toBe(false);
  });

  it("getApiErrorCode returns null when no code is present", () => {
    expect(
      getApiErrorCode(new ApiError(500, "", "Internal Server Error")),
    ).toBeNull();
    expect(
      getApiErrorCode(makeApiError({ detail: "plain string" })),
    ).toBeNull();
    expect(
      getApiErrorCode(makeApiError({ detail: { message: "no error key" } })),
    ).toBeNull();
  });
});
