import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { AuthEventsTable } from "@/routes/admin/_components/audit/AuthEventsTable";
import i18n from "@/i18n";
import { server } from "@/test/msw-handlers";
import { renderWithQueryClient } from "@/test/react-query-wrapper";

/**
 * FR-1.6 — the auth-events tab is the only surface where "did this account
 * pass MFA?" is answerable without inferring it from a path and a status
 * code, so the two judgement calls in it are worth pinning:
 *
 *  * a NULL `actor_user_id` is the normal case (the subject acted on their own
 *    account) and must read as "self", not as the system actor — the other
 *    tables use "system" for a null user and copying that here would claim the
 *    platform signed someone in;
 *  * `detail` is an open JSONB bag, so an unknown key has to be visibly
 *    counted rather than dropped, or a key added backend-side disappears from
 *    the console without anyone noticing.
 */

const SUBJECT = "11111111-1111-1111-1111-111111111111";
const ACTOR = "22222222-2222-2222-2222-222222222222";

const ROWS = [
  {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    event_type: "mfa_verified",
    user_id: SUBJECT,
    actor_user_id: null,
    organization_id: null,
    session_id: null,
    detail: { method: "totp" },
    occurred_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "aaaaaaaa-0000-0000-0000-000000000002",
    event_type: "role_revoked",
    user_id: SUBJECT,
    actor_user_id: ACTOR,
    organization_id: null,
    session_id: null,
    // `assignment_id` is written by the recorder but is not one of the keys
    // the table chips, so it must show up in the overflow count.
    detail: { role_code: "teacher", scope_kind: "course", assignment_id: "x" },
    occurred_at: "2026-09-01T09:00:00Z",
  },
];

function mockFeed(rows: unknown[] = ROWS) {
  server.use(
    http.get("http://localhost:8000/api/v1/admin/audit/auth-events", () =>
      HttpResponse.json(rows),
    ),
    http.get("http://localhost:8000/api/v1/users/by-ids", () =>
      HttpResponse.json([]),
    ),
  );
}

describe("AuthEventsTable", () => {
  beforeEach(() => {
    // `apiFetch` goes through `authenticatedFetch`, which throws
    // "Not authenticated" with no stored session — the table would render its
    // error panel and every assertion below would fail for the wrong reason.
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
        id: "00000000-0000-0000-0000-0000000000ad",
        primary_email: "admin@example.test",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        profile: null,
      }),
    );
    localStorage.setItem("abridgeai.requires_mfa", "false");
  });

  it("renders typed event names rather than request paths", async () => {
    mockFeed();
    renderWithQueryClient(<AuthEventsTable sinceIso="2026-09-01T00:00:00Z" />);

    await waitFor(() =>
      expect(
        screen.getByText(i18n.t("admin.audit.auth_events.types.mfa_verified")),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(i18n.t("admin.audit.auth_events.types.role_revoked")),
    ).toBeInTheDocument();
  });

  it("labels a null actor as self, not as the system", async () => {
    mockFeed();
    renderWithQueryClient(<AuthEventsTable sinceIso="2026-09-01T00:00:00Z" />);

    await waitFor(() =>
      expect(
        screen.getByText(i18n.t("admin.audit.auth_events.self")),
      ).toBeInTheDocument(),
    );
    // The system label belongs to a null SUBJECT, which neither row has.
    expect(
      screen.queryByText(i18n.t("admin.audit.system")),
    ).not.toBeInTheDocument();
  });

  it("chips the known detail keys and counts the rest", async () => {
    mockFeed();
    renderWithQueryClient(<AuthEventsTable sinceIso="2026-09-01T00:00:00Z" />);

    await waitFor(() => expect(screen.getByText("totp")).toBeInTheDocument());
    expect(screen.getByText("teacher")).toBeInTheDocument();
    expect(screen.getByText("course")).toBeInTheDocument();
    // assignment_id is not chipped, but it is not silently dropped either.
    expect(
      screen.getByText(
        i18n.t("admin.audit.auth_events.more_detail", { count: 1 }),
      ),
    ).toBeInTheDocument();
  });

  it("renders an em dash when the recorder wrote no detail", async () => {
    mockFeed([{ ...ROWS[0], detail: {} }]);
    renderWithQueryClient(<AuthEventsTable sinceIso="2026-09-01T00:00:00Z" />);

    await waitFor(() =>
      expect(
        screen.getByText(i18n.t("admin.audit.auth_events.types.mfa_verified")),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
