import { Link, useParams } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, FileText } from "lucide-react";

import { RichContent } from "@/components/ui/rich-content";
import TopNavBar from "@/components/layout/TopNavBar";
import Footer from "@/components/layout/Footer";
import {
  POLICY_DOCUMENTS,
  POLICY_ORDER,
  type PolicySlug,
} from "@/lib/help-content";
import { cn } from "@/lib/utils";

/**
 * Public policy page — one route serving privacy / terms / cookies via $slug.
 *
 * Public for the same reason as /help, and more pressingly: a user must be able
 * to read the terms BEFORE creating an account or signing in. Gating these
 * behind auth would defeat their purpose.
 *
 * Renders a visible draft notice. The bodies in help-content.ts are structural
 * placeholders that have not had legal review, and there is no acceptance
 * tracking — nothing records which version a user agreed to. Claiming these are
 * binding terms while neither is true would be worse than showing nothing.
 */
export default function PolicyPage() {
  const { slug } = useParams({ strict: false }) as { slug?: string };

  const known = POLICY_ORDER.includes(slug as PolicySlug);
  const doc = known ? POLICY_DOCUMENTS[slug as PolicySlug] : null;

  if (!doc) {
    return (
      <div className="min-h-screen bg-m3-surface flex flex-col">
        <TopNavBar />
        <div className="mx-auto w-full max-w-3xl flex-1 px-5 pb-12 pt-28 sm:px-8">
          <h1 className="font-headline text-2xl font-bold text-m3-on-surface">
            Policy not found
          </h1>
          <p className="mt-2 text-sm text-m3-on-surface-variant">
            No policy document matches “{slug}”.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {POLICY_ORDER.map((s) => (
              <Link
                key={s}
                to="/policy/$slug"
                params={{ slug: s }}
                className="text-sm font-medium text-m3-primary hover:underline"
              >
                {POLICY_DOCUMENTS[s].title}
              </Link>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    // TopNavBar rather than ContentTopBar — see the note in help.tsx: these
    // routes are public and ContentTopBar assumes an authenticated user.
    <div className="min-h-screen bg-m3-surface flex flex-col">
      <TopNavBar />
      <div className="mx-auto w-full max-w-3xl flex-1 px-5 pb-12 pt-28 sm:px-8">
        <Link
          to="/help"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-m3-on-surface-variant hover:text-m3-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Help &amp; FAQ
        </Link>

        <header className="mb-6">
          <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-m3-primary-fixed">
            <FileText className="h-5 w-5 text-m3-primary" />
          </span>
          <h1 className="font-headline text-3xl font-bold text-m3-on-surface">
            {doc.title}
          </h1>
          <p className="mt-2 text-sm text-m3-on-surface-variant">
            Last updated {doc.lastUpdated}
          </p>
        </header>

        {/* Draft notice — deliberately prominent, not a footnote. */}
        <div className="mb-8 flex gap-3 rounded-xl border border-amber-300 bg-amber-50/70 px-4 py-3">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
          />
          <p className="text-xs leading-relaxed text-amber-900">
            <strong className="font-semibold">Draft.</strong> This document is a
            working draft pending review and is not a binding agreement. Version
            history and recorded acceptance are not yet implemented.
          </p>
        </div>

        <RichContent value={doc.body} format="markdown" />

        {/* Sibling policies, so a reader can move between them directly. */}
        <nav className="mt-12 border-t border-m3-outline-variant/20 pt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Other policies
          </h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {POLICY_ORDER.map((s) => (
              <Link
                key={s}
                to="/policy/$slug"
                params={{ slug: s }}
                className={cn(
                  "text-sm font-medium hover:underline",
                  s === doc.slug
                    ? "text-m3-on-surface-variant"
                    : "text-m3-primary",
                )}
                aria-current={s === doc.slug ? "page" : undefined}
              >
                {POLICY_DOCUMENTS[s].title}
              </Link>
            ))}
          </div>
        </nav>
      </div>
      <Footer />
    </div>
  );
}
