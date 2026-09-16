import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// The page's two data sources, mocked so each test controls both shapes.
const mocks = vi.hoisted(() => ({
  session: { current: null as Record<string, unknown> | null },
  gapFetch: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ history: { back: vi.fn() } }),
  useNavigate: () => vi.fn(),
  useParams: () => ({ sessionId: "s-1" }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" },
  }),
}));

vi.mock("@/lib/api/hooks/interviews", () => ({
  useTeacherInterviewSession: () => ({
    data: mocks.session.current,
    isLoading: false,
  }),
  useTeacherGapReport: (sessionId: unknown, options?: { session?: unknown }) => {
    void sessionId;
    const s = options?.session as { status?: string } | null | undefined;
    const enabled =
      s === undefined ? true : !(s === null || s.status === "abandoned" || s.status === "failed");
    if (enabled) {
      mocks.gapFetch(options?.session);
    }
    return { data: null, isLoading: false, isError: false, error: null };
  },
}));

// Child cards pull server data; stub the workspace so the page renders bare.
vi.mock("@/routes/teacher/_components/interview-gap-report/ContextCard", () => ({
  ContextCard: () => null,
}));
vi.mock("@/routes/teacher/_components/interview-gap-report/CriterionBreakdown", () => ({
  CriterionBreakdown: () => null,
}));
vi.mock("@/routes/teacher/_components/interview-gap-report/GapTabBar", () => ({
  GapTabBar: () => null,
}));
vi.mock("@/routes/teacher/_components/interview-gap-report/Header", () => ({
  Header: () => null,
}));
vi.mock("@/routes/teacher/_components/interview-gap-report/IntegrityCard", () => ({
  IntegrityCard: () => null,
}));
vi.mock("@/routes/teacher/_components/interview-gap-report/NotesCard", () => ({
  NotesCard: () => null,
}));
vi.mock("@/routes/teacher/_components/interview-gap-report/PersonaAdherenceCard", () => ({
  PersonaAdherenceCard: () => null,
}));
vi.mock("@/routes/teacher/_components/interview-gap-report/TranscriptCard", () => ({
  TranscriptCard: () => null,
}));

import InterviewGapReportPage from "@/routes/teacher/interview-gap-report";

/**
 * The GAP page must resolve "no report" WITHOUT the request/retry storm.
 *
 * The production failure: an `abandoned` attempt (never enqueued for
 * evaluation) rendered a full-screen spinner while the report query retried
 * its 404 sixty times over three minutes — `isLoading` was checked first, so
 * the empty state never got a chance. These tests pin the new order:
 * session → availability → empty state immediately; spinner only while the
 * session itself is unresolved.
 */

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    session_id: "s-1",
    interview_config_id: "cfg-1",
    status: "completed",
    input_mode: "text",
    attempt_number: 1,
    started_at: "2026-09-16T00:00:00Z",
    pass_verdict: null,
    evaluation_state: "pending",
    ...overrides,
  };
}

describe("interview-gap-report route availability", () => {
  it("renders the Not graded empty state immediately for an abandoned session", async () => {
    mocks.session.current = baseSession({
      status: "abandoned",
      evaluation_state: "not_required",
    });
    render(<InterviewGapReportPage />);

    // The exact heading + explanation, NOT a spinner.
    await waitFor(() => {
      expect(
        screen.getByText(
          "teacher_interview_gap_report.empty_states.not_graded",
        ),
      ).toBeDefined();
    });
    expect(
      screen.getByText("teacher_interview_gap_report.errors.never_graded"),
    ).toBeDefined();
    expect(document.querySelector(".animate-spin")).toBeNull();
  });

  it("renders the exhausted empty state for a dead evaluation", async () => {
    mocks.session.current = baseSession({
      status: "failed",
      evaluation_state: "exhausted",
    });
    render(<InterviewGapReportPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "teacher_interview_gap_report.empty_states.evaluation_exhausted",
        ),
      ).toBeDefined();
    });
    expect(document.querySelector(".animate-spin")).toBeNull();
  });

  it("shows the waiting state (not an error) for a pending session", async () => {
    mocks.session.current = baseSession({
      status: "failed",
      evaluation_state: "pending",
    });
    render(<InterviewGapReportPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "teacher_interview_gap_report.errors.pending_grading",
        ),
      ).toBeDefined();
    });
  });

  it("keeps the spinner only while the session is still unknown", () => {
    mocks.session.current = null;
    render(<InterviewGapReportPage />);

    // Session query unresolved: spinner is correct here — availability is
    // not yet known, and no empty state may claim the report will never come.
    expect(document.querySelector(".animate-spin")).not.toBeNull();
  });
});
