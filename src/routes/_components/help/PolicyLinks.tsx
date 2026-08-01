import { Link } from "@tanstack/react-router";

import { POLICY_DOCUMENTS, POLICY_ORDER } from "@/lib/help-content";

/**
 * Policies — the other half of what these pages are for, so link them
 * rather than making the user hunt in the footer.
 */
export default function PolicyLinks() {
  return (
    <section className="mt-12 border-t border-m3-outline-variant/20 pt-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        Policies
      </h2>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {POLICY_ORDER.map((slug) => (
          <Link
            key={slug}
            to="/policy/$slug"
            params={{ slug }}
            className="text-sm font-medium text-m3-primary hover:underline"
          >
            {POLICY_DOCUMENTS[slug].title}
          </Link>
        ))}
      </div>
    </section>
  );
}
