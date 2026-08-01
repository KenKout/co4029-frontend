import type { CoursePublic } from "@/lib/api/types";

const CARD_GRADIENTS = [
  "from-blue-500 via-blue-700 to-blue-800",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-pink-500 via-rose-500 to-orange-500",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-red-500",
  "from-blue-500 via-blue-600 to-sky-500",
];

export function slugGradient(slug: string) {
  const hash = slug.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}

/**
 * The four optional contact fields, trimmed, plus whether any survived.
 *
 * Lifted verbatim out of InstructorCard: a whitespace-only field counts as
 * absent, which is what keeps the contact half (and the whole card) from
 * rendering an empty section. `src/routes/__tests__/course-detail-instructor.test.tsx`
 * pins this predicate.
 */
export function deriveContactLinks(course: CoursePublic) {
  const email = course.contact_email?.trim();
  const phone = course.contact_phone?.trim();
  const website = course.contact_website_url?.trim();
  const social = course.contact_social_url?.trim();
  const hasContact = Boolean(email || phone || website || social);
  return { email, phone, website, social, hasContact };
}

/** Strip the scheme for a cleaner visible label on URL rows. */
export function prettyUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
