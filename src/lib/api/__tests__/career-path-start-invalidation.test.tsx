import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMyEnrollment } from "@/lib/api/hooks/me";
import { useStartCourse } from "@/lib/api/hooks/career-paths";

const COURSE_ID = "course-1";
const PATH_ID = "path-1";

function urlOf(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input.toString();
}

function Probe() {
  const enrollment = useMyEnrollment(COURSE_ID);
  const start = useStartCourse(PATH_ID);
  return (
    <>
      <span data-testid="mutation">
        {start.isSuccess
          ? "success"
          : start.isError
            ? start.error instanceof Error
              ? start.error.message
              : "error"
            : "idle"}
      </span>
      <span data-testid="state">
        {enrollment.data ? "enrolled" : "enrollment-required"}
      </span>
      <button onClick={() => start.mutate(COURSE_ID)}>start</button>
    </>
  );
}

describe("career-path course start invalidation", () => {
  let enrollmentCalls: number;

  beforeEach(() => {
    localStorage.setItem("abridgeai.access_token", "test-token");
    localStorage.setItem("abridgeai.refresh_token", "test-refresh");
    localStorage.setItem("abridgeai.token_type", "bearer");
    localStorage.setItem(
      "abridgeai.access_token_expires_at",
      String(Date.now() + 3600_000),
    );
    localStorage.setItem(
      "abridgeai.user",
      JSON.stringify({
        id: "student-1",
        primary_email: "student@example.com",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        profile: null,
      }),
    );
    localStorage.setItem("abridgeai.requires_mfa", "false");
    enrollmentCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = urlOf(input);
        if (url.endsWith(`/me/enrollments/${COURSE_ID}`)) {
          enrollmentCalls += 1;
          if (enrollmentCalls === 1) {
            return Promise.resolve(
              new Response(JSON.stringify({ detail: "not enrolled" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
              }),
            );
          }
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: "enrollment-1",
                course_id: COURSE_ID,
                status: "active",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }
        if (
          url.endsWith(
            `/me/career-enrollments/${PATH_ID}/courses/${COURSE_ID}/start`,
          )
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ course_id: COURSE_ID, created: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("refreshes the landing enrollment gate after starting from a path", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Probe />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("enrollment-required"),
    );
    await user.click(screen.getByRole("button", { name: "start" }));

    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("enrolled"),
    );
    expect(enrollmentCalls).toBeGreaterThanOrEqual(2);
  });
});
