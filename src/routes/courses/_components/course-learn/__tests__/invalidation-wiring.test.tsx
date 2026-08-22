import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMyCourseProgress, useMarkLessonComplete } from "@/lib/api/hooks/progress";

/**
 * Settles the "mark complete → status map doesn't update" bug report.
 * Uses the REAL hooks + REAL QueryClient so the invalidation wiring is
 * exercised end-to-end (fetch is mocked at the transport layer).
 */

const COURSE_ID = "c1";
const LESSON_ID = "fd79fb33-9fca-4c5d-bc48-ec87f12a8445";

function urlOf(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input.toString();
}

function summaryPayload(status: string) {
  return {
    course_id: COURSE_ID,
    total_lessons: 1,
    completed_lessons: status === "completed" ? 1 : 0,
    in_progress_lessons: 0,
    not_started_lessons: 1,
    completion_percent: status === "completed" ? 100 : 0,
    total_time_seconds: 0,
    last_activity_at: null,
    lessons: [
      {
        lesson_id: LESSON_ID,
        status,
        completion_percent: status === "completed" ? 100 : 0,
        last_activity_at: null,
        total_time_seconds: 0,
      },
    ],
  };
}

function lessonProgressPayload(status: string) {
  return {
    id: "lp-1",
    user_id: "u1",
    lesson_id: LESSON_ID,
    status,
    completion_percent: status === "completed" ? 100 : 0,
    last_activity_at: null,
    total_time_seconds: 0,
  };
}

function Probe() {
  const { data } = useMyCourseProgress(COURSE_ID);
  const statusMap = new Map((data?.lessons ?? []).map((l) => [l.lesson_id, l.status]));
  const mark = useMarkLessonComplete({ lessonId: LESSON_ID, courseId: COURSE_ID });
  const status = statusMap.get(LESSON_ID);
  return (
    <div>
      <span data-testid="status">{status ?? "none"}</span>
      <button onClick={() => mark.mutate(LESSON_ID)}>mark</button>
    </div>
  );
}

describe("mark-complete invalidation wiring", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // authenticatedFetch requires a stored auth session before it calls
    // fetch — seed localStorage so the real hooks run their real requests.
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
        id: "u1",
        primary_email: "t@t.test",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        profile: null,
      }),
    );
    localStorage.setItem("abridgeai.requires_mfa", "false");
    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      if (url.endsWith(`/me/progress/courses/${COURSE_ID}`)) {
        return Promise.resolve(
          new Response(JSON.stringify(summaryPayload("not_started")), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (url.endsWith(`/me/progress/lessons/${LESSON_ID}/complete`)) {
        return Promise.resolve(
          new Response(JSON.stringify(lessonProgressPayload("completed")), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ detail: "no mock" }), { status: 404 }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("refetches the course summary after the complete mutation (map flips to completed)", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000, retry: 0 } },
    });
    // Second GET of the summary returns completed — simulates the server
    // state having changed after the POST.
    let summaryCalls = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = urlOf(input);
      if (url.endsWith(`/me/progress/courses/${COURSE_ID}`)) {
        summaryCalls += 1;
        return Promise.resolve(
          new Response(
            JSON.stringify(summaryPayload(summaryCalls >= 2 ? "completed" : "not_started")),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith(`/me/progress/lessons/${LESSON_ID}/complete`)) {
        return Promise.resolve(
          new Response(JSON.stringify(lessonProgressPayload("completed")), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ detail: "no mock" }), { status: 404 }),
      );
    });

    render(
      <QueryClientProvider client={qc}>
        <Probe />
      </QueryClientProvider>,
    );

    // Initial fetch: not_started.
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("not_started"));
    expect(summaryCalls).toBe(1);

    // Click the complete button — the real mutation runs, and its onSuccess
    // invalidates ["progress","my-course",COURSE_ID].
    await userEvent.click(screen.getByText("mark"));

    // If invalidation works, the summary is refetched (2nd call) and the
    // map flips to completed.
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("completed"));
    expect(summaryCalls).toBeGreaterThanOrEqual(2);
  });

  it("flips the map instantly via the optimistic patch while the refetch is still in flight", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000, retry: 0 } },
    });
    // The summary refetch is DELAYED (slow network). The map must flip to
    // completed the moment the mutation succeeds — the optimistic in-place
    // patch closes the stale window instead of waiting for the refetch.
    const gate: { release: (() => void) | null } = { release: null };
    let summaryCalls = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = urlOf(input);
      if (url.endsWith(`/me/progress/courses/${COURSE_ID}`)) {
        summaryCalls += 1;
        if (summaryCalls >= 2) {
          return new Promise<Response>((resolve) => {
            gate.release = () =>
              resolve(
                new Response(JSON.stringify(summaryPayload("completed")), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                }),
              );
          });
        }
        return Promise.resolve(
          new Response(JSON.stringify(summaryPayload("not_started")), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (url.endsWith(`/me/progress/lessons/${LESSON_ID}/complete`)) {
        return Promise.resolve(
          new Response(JSON.stringify(lessonProgressPayload("completed")), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ detail: "no mock" }), { status: 404 }),
      );
    });

    render(
      <QueryClientProvider client={qc}>
        <Probe />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("not_started"));

    await userEvent.click(screen.getByText("mark"));

    // The optimistic patch flips the map while the refetch response is
    // still blocked — if the flip depended on the refetch, the status would
    // still be not_started here.
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("completed"));
    expect(gate.release).not.toBeNull(); // refetch started but never landed

    // Release the refetch — the authoritative payload confirms, state holds.
    if (gate.release) gate.release();
    await waitFor(() => expect(summaryCalls).toBeGreaterThanOrEqual(2));
    expect(screen.getByTestId("status").textContent).toBe("completed");
  });
});
