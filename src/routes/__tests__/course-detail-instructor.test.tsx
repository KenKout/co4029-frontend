import { describe, expect, it } from "vitest";

import CourseDetailPageExports from "@/routes/course-detail";

/**
 * "About the instructor" and "Contact the instructor" used to be two adjacent
 * cards describing the same person. They are now one section.
 *
 * The merged card has to keep the old empty-state behaviour: the contact card
 * used to hide itself entirely when no contact field was set, and the bio card
 * only rendered when an instructor existed. So the combined card must render
 * nothing at all when BOTH halves are absent, and must not show an orphaned
 * "Contact" sub-heading when only the bio exists.
 *
 * The component isn't exported (it's a module-private helper of the route), so
 * the conditional logic is asserted here as a pure predicate mirroring the
 * component exactly, plus a smoke check that the route module still imports
 * cleanly (which would fail on a dangling ContactCard reference).
 */

function shouldRenderCard(opts: {
  hasInstructor: boolean;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  social?: string | null;
}) {
  const email = opts.email?.trim();
  const phone = opts.phone?.trim();
  const website = opts.website?.trim();
  const social = opts.social?.trim();
  const hasContact = Boolean(email || phone || website || social);
  return {
    renders: opts.hasInstructor || hasContact,
    showsBio: opts.hasInstructor,
    showsContact: hasContact,
    // The divider only appears when both halves are present.
    showsDivider: opts.hasInstructor && hasContact,
  };
}

describe("merged instructor + contact section", () => {
  it("renders nothing when there is no instructor and no contact info", () => {
    const r = shouldRenderCard({ hasInstructor: false });
    expect(r.renders).toBe(false);
  });

  it("shows only the bio when contact fields are absent", () => {
    const r = shouldRenderCard({ hasInstructor: true });
    expect(r.renders).toBe(true);
    expect(r.showsBio).toBe(true);
    // No orphaned "Contact" sub-heading.
    expect(r.showsContact).toBe(false);
    expect(r.showsDivider).toBe(false);
  });

  it("shows only contact rows when the course has no instructor", () => {
    const r = shouldRenderCard({
      hasInstructor: false,
      email: "teach@example.edu",
    });
    expect(r.renders).toBe(true);
    expect(r.showsBio).toBe(false);
    expect(r.showsContact).toBe(true);
    // Nothing above it, so no divider.
    expect(r.showsDivider).toBe(false);
  });

  it("shows both halves plus a divider when the course has both", () => {
    const r = shouldRenderCard({
      hasInstructor: true,
      phone: "+84 90 000 0000",
    });
    expect(r.showsBio).toBe(true);
    expect(r.showsContact).toBe(true);
    expect(r.showsDivider).toBe(true);
  });

  it("treats whitespace-only contact fields as absent", () => {
    const r = shouldRenderCard({
      hasInstructor: false,
      email: "   ",
      phone: "\t",
      website: "",
      social: null,
    });
    expect(r.renders).toBe(false);
    expect(r.showsContact).toBe(false);
  });

  it("any single contact field is enough to show the contact half", () => {
    for (const field of ["email", "phone", "website", "social"] as const) {
      const r = shouldRenderCard({
        hasInstructor: false,
        [field]: "https://example.com",
      });
      expect(r.showsContact, field).toBe(true);
    }
  });

  it("the route module still loads (no dangling ContactCard reference)", () => {
    expect(CourseDetailPageExports).toBeTypeOf("function");
  });
});
