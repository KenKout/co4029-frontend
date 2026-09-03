import type { PolicyDetail, PolicyVersionSummary } from "@/lib/api/hooks/policies";

/**
 * Which version of a policy an admin screen should talk about.
 *
 * A policy can hold three interesting versions at once — what readers see now,
 * what is being written, and older archived text — so every admin surface has
 * to answer the same question: which one do I name here? Answering it in one
 * place keeps the list row, the header and the editor from disagreeing.
 *
 * `shown` is the draft when one is open (that is what the admin is working on)
 * and otherwise the published version. `published` is what readers actually
 * get, which is not the same thing and is reported separately.
 */
export function displayVersion(
  policy: PolicyDetail,
  language = "en",
): {
  published: PolicyVersionSummary | null;
  draft: PolicyVersionSummary | null;
  shown: PolicyVersionSummary | null;
} {
  const inLanguage = policy.versions.filter((v) => v.language === language);
  const published =
    inLanguage.find((v) => v.status === "published") ??
    // A policy that has no version in this language at all should still name
    // itself rather than render blank, so fall back across languages.
    policy.versions.find((v) => v.status === "published") ??
    null;
  const draft =
    inLanguage.find((v) => v.status === "draft") ??
    policy.versions.find((v) => v.status === "draft") ??
    null;

  return { published, draft, shown: draft ?? published ?? policy.versions[0] ?? null };
}
