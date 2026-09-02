import { describe, expect, it } from "vitest";

import {
  notificationDeepLink,
  parseNotificationBody,
  parseRemediationDeepLink,
} from "@/lib/notifications/deep-link";
import type { Notification } from "@/lib/api/types";

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "ntf_1",
    user_id: "user_1",
    category: "spaced_repetition",
    title: "Card to revisit",
    body: null,
    entity_type: null,
    entity_id: null,
    channel: "in_app",
    read_at: null,
    created_at: "2026-05-18T10:00:00.000Z",
    ...overrides,
  } as Notification;
}

describe("parseNotificationBody (W5.10)", () => {
  it("parses an SR remediation Markdown body into clickable link segments", () => {
    const body =
      "Bạn cần ôn lại tài liệu sau: " +
      "[Phần 2: Đệ quy](/courses/algorithms/lessons/lsn_42/resources/mat_99?t=180) — chúc bạn học tốt!";

    const segments = parseNotificationBody(body);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({
      type: "text",
      text: "Bạn cần ôn lại tài liệu sau: ",
    });
    expect(segments[1]).toEqual({
      type: "link",
      label: "Phần 2: Đệ quy",
      url: "/courses/algorithms/lessons/lsn_42/resources/mat_99?t=180",
    });
    expect(segments[2]).toEqual({
      type: "text",
      text: " — chúc bạn học tốt!",
    });
  });

  it("returns plain text when no Markdown link is present", () => {
    const segments = parseNotificationBody("Just a reminder, nothing here.");
    expect(segments).toEqual([
      { type: "text", text: "Just a reminder, nothing here." },
    ]);
  });

  it("returns empty array on null/empty body", () => {
    expect(parseNotificationBody(null)).toEqual([]);
    expect(parseNotificationBody("")).toEqual([]);
  });
});

describe("parseRemediationDeepLink (W5.10)", () => {
  it("extracts ?t= seconds for audio/video remediation links", () => {
    const parsed = parseRemediationDeepLink(
      "/courses/algorithms/lessons/lsn_42/resources/mat_99?t=180",
    );
    expect(parsed?.seconds).toBe(180);
    expect(parsed?.page).toBeNull();
    expect(parsed?.anchor).toBeNull();
  });

  it("extracts ?p= page for pdf/slides remediation links", () => {
    const parsed = parseRemediationDeepLink(
      "/courses/algorithms/lessons/lsn_42/resources/mat_99?p=5",
    );
    expect(parsed?.page).toBe(5);
    expect(parsed?.seconds).toBeNull();
  });

  it("extracts #anchor for html remediation links", () => {
    const parsed = parseRemediationDeepLink(
      "/courses/algorithms/lessons/lsn_42/resources/mat_99#section-2",
    );
    expect(parsed?.anchor).toBe("section-2");
    expect(parsed?.seconds).toBeNull();
    expect(parsed?.page).toBeNull();
  });

  it("returns null for an unparseable URL", () => {
    expect(parseRemediationDeepLink("\u0000not a url")).toBeTypeOf("object");
  });
});

describe("notificationDeepLink (Option B)", () => {
  it("prefers action_url when present (backend-precomputed deep link)", () => {
    const link = notificationDeepLink(
      makeNotification({
        action_url: "/courses/intro-to-ml/learn",
        // action_url wins even if an entity mapping would also apply.
        entity_type: "enrollment",
        entity_id: "enr_1",
      }),
    );
    expect(link).toBe("/courses/intro-to-ml/learn");
  });

  it("falls back to a static route for enrollment entities", () => {
    const link = notificationDeepLink(
      makeNotification({ entity_type: "enrollment", entity_id: "enr_1" }),
    );
    expect(link).toBe("/me/progress");
  });

  it("returns null for slug-less entities without action_url (quiz)", () => {
    // A quiz route needs a course slug, which entity_id alone can't provide,
    // so a legacy row without action_url is intentionally non-navigable.
    const link = notificationDeepLink(
      makeNotification({ entity_type: "quiz", entity_id: "qz_1" }),
    );
    expect(link).toBeNull();
  });

  it("returns null when entity_type and action_url are both missing", () => {
    expect(notificationDeepLink(makeNotification())).toBeNull();
  });
});
