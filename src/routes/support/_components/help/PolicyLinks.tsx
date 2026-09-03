import { Link } from "@tanstack/react-router";

import { POLICY_ORDER, POLICY_TITLES } from "@/lib/help-content";
import { useReaderPolicies } from "../use-reader-policies";

/**
 * Policies — the other half of what these pages are for, so link them
 * rather than making the user hunt in the footer.
 *
 * Role-scoped: a student is offered the policies a student is a party to.
 * Until the index arrives (or if it fails) this falls back to the static slug
 * manifest, because a help page that silently drops its policy section is
 * worse than one that briefly over-offers — every slug listed resolves to a
 * real route either way.
 */
export default function PolicyLinks() {
  const { data } = useReaderPolicies();
  const links = data?.length
    ? data.map((p) => ({ slug: p.slug, title: p.title }))
    : POLICY_ORDER.map((slug) => ({ slug, title: POLICY_TITLES[slug] }));

  return (
    <section className="mt-12 border-t border-m3-outline-variant/20 pt-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        Policies
      </h2>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {links.map(({ slug, title }) => (
          <Link
            key={slug}
            to="/policy/$slug"
            params={{ slug }}
            className="text-sm font-medium text-m3-primary hover:underline"
          >
            {title}
          </Link>
        ))}
      </div>
    </section>
  );
}
