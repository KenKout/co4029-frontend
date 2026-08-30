import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/client";
import {
  getApiErrorCode,
  getApiErrorMessage,
  isApiErrorCode,
} from "@/lib/api/error-codes";

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

describe("getApiErrorMessage", () => {
  it("prefers detail.message over the raw ApiError message", () => {
    const err = makeApiError(
      {
        detail: {
          error: "concurrent_program_limit_reached",
          message: "Anh Nguyen is already in 1 active learning program(s).",
          student_id: "71acb8a2-b123-4ef9-a4d6-cb0bd1a9a02c",
          limit: 1,
        },
      },
      409,
    );

    expect(getApiErrorMessage(err, "Could not enroll students")).toBe(
      "Anh Nguyen is already in 1 active learning program(s).",
    );
    // Never the machine code, and never the raw `API 409: {...}` dump.
    expect(getApiErrorMessage(err, "fallback")).not.toContain(
      "concurrent_program_limit_reached",
    );
  });

  it("accepts a string detail (FastAPI's default shape)", () => {
    expect(
      getApiErrorMessage(makeApiError({ detail: "Not allowed here" }, 403), "f"),
    ).toBe("Not allowed here");
  });

  it("falls back when the body carries only a machine code", () => {
    const err = makeApiError({ detail: { error: "program_is_not_active" } }, 409);
    expect(getApiErrorMessage(err, "Could not enroll students")).toBe(
      "Could not enroll students",
    );
  });

  it("falls back on an unparseable or empty body", () => {
    expect(
      getApiErrorMessage(new ApiError(500, "", "Internal Server Error"), "boom"),
    ).toBe("boom");
    expect(
      getApiErrorMessage(new ApiError(502, "<html>", "Bad Gateway"), "boom"),
    ).toBe("boom");
  });

  it("uses a plain Error's message, and the fallback for anything else", () => {
    expect(getApiErrorMessage(new Error("network down"), "boom")).toBe(
      "network down",
    );
    expect(getApiErrorMessage(null, "boom")).toBe("boom");
    expect(getApiErrorMessage(undefined, "boom")).toBe("boom");
  });
});
