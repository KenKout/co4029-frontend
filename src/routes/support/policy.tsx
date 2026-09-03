import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";

import { RichContent } from "@/components/ui/rich-content";
import { Skeleton } from "@/components/ui/skeleton";
import TopNavBar from "@/components/layout/TopNavBar";
import Footer from "@/components/layout/Footer";
import { usePolicy } from "@/lib/api/hooks/policies";
import { POLICY_ORDER, POLICY_TITLES, type PolicySlug } from "@/lib/help-content";
import { cn } from "@/lib/utils";
import { useReaderPolicies } from "./_components/use-reader-policies";

/**
 * Public policy page — one route serving every policy via $slug.
 *
 * Public for the same reason as /help, and more pressingly: a user must be able
 * to read the terms BEFORE creating an account or signing in. Gating these
 * behind auth would defeat their purpose, so nothing on this page requires a
 * session — the reader endpoints are unauthenticated by design.
 *
 * The body is whatever version an admin has PUBLISHED, fetched at render time.
 * It used to be a hardcoded constant with a blanket "draft" banner; now each
 * document carries its own version number, publication date and publisher, so
 * the page states that provenance instead of disclaiming all of it at once.
 */
/**
 * Typographic convention for policy documents. Every /policy/$slug page renders
 * through this same component, so the convention is defined here once:
 *
 * - section headings (## ) are LARGE, bold, with generous space above and a
 *   snug gap to the paragraph they introduce — reads as a formal document,
 *   not a chat thread;
 * - paragraphs get comfortable vertical rhythm + relaxed leading;
 * - list items separate; emphasized terms and links stay on-color.
 *
 * Scoped with arbitrary variants ([&_h2] etc.) because this app is Tailwind
 * v4 WITHOUT the typography plugin registered (app.css never imports
 * @tailwindcss/typography), so prose-* modifiers compile to nothing. These
 * element-scoped utilities hit exactly the markdown nodes inside RichContent
 * and nothing else.
 */
const POLICY_BODY_PROSE =
  "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold " +
  "[&_h2]:font-headline [&_h2]:tracking-tight [&_h2]:leading-snug " +
  "[&_h2:first-child]:mt-0 " +
  "[&_p]:my-4 [&_p]:leading-relaxed " +
  "[&_li]:my-1.5 " +
  "[&_strong]:font-semibold " +
  "[&_a]:font-medium [&_a]:text-m3-primary [&_a]:underline-offset-2";

/** Long-form date, e.g. "22 August 2026" — matches how policies cite dates. */
function formatPublished(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Shell shared by every state, so chrome never reflows between them. */
function PolicyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-m3-surface flex flex-col">
      <TopNavBar />
      <div className="mx-auto w-full max-w-3xl flex-1 px-5 pb-12 pt-28 sm:px-8">
        {children}
      </div>
      <Footer />
    </div>
  );
}

/**
 * Sibling policies, so a reader can move between them directly.
 *
 * Sourced from the reader's own index, which is role-scoped — there is no
 * point offering a link to a document this reader will be told they cannot
 * see. Falls back to the static slug manifest before the index arrives.
 */
function SiblingPolicies({ current }: { current?: string }) {
  const { data } = useReaderPolicies();
  const siblings = data?.length
    ? data.map((p) => ({ slug: p.slug as PolicySlug, title: p.title }))
    : POLICY_ORDER.map((slug) => ({ slug, title: POLICY_TITLES[slug] }));

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {siblings.map(({ slug, title }) => (
        <Link
          key={slug}
          to="/policy/$slug"
          params={{ slug }}
          className={cn(
            "text-sm font-medium hover:underline",
            slug === current ? "text-m3-on-surface-variant" : "text-m3-primary",
          )}
          aria-current={slug === current ? "page" : undefined}
        >
          {title}
        </Link>
      ))}
    </div>
  );
}

export default function PolicyPage() {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const { data: doc, isPending, isError } = usePolicy(slug);

  if (isPending) {
    return (
      <PolicyShell>
        <Skeleton className="h-11 w-11 rounded-xl" />
        <Skeleton className="mt-4 h-9 w-2/3" />
        <Skeleton className="mt-3 h-4 w-48" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={i % 4 === 3 ? "h-4 w-2/3" : "h-4 w-full"} />
          ))}
        </div>
      </PolicyShell>
    );
  }

  // A 404 and a network failure land in the same place deliberately: either
  // way there is no document to show, and the useful next step is identical.
  if (isError || !doc) {
    return (
      <PolicyShell>
        <h1 className="font-headline text-2xl font-bold text-m3-on-surface">
          Policy not found
        </h1>
        <p className="mt-2 text-sm text-m3-on-surface-variant">
          No published policy matches “{slug}”. It may not be published yet, or
          it may not apply to your role.
        </p>
        <div className="mt-6">
          <SiblingPolicies />
        </div>
      </PolicyShell>
    );
  }

  return (
    // TopNavBar rather than ContentTopBar — see the note in help.tsx: these
    // routes are public and ContentTopBar assumes an authenticated user.
    <PolicyShell>
      <Link
        to="/help"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-m3-on-surface-variant hover:text-m3-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Help &amp; FAQ
      </Link>

      <header className="mb-8">
        <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-m3-primary-fixed">
          <FileText className="h-5 w-5 text-m3-primary" />
        </span>
        <h1 className="font-headline text-3xl font-bold leading-tight text-m3-on-surface">
          {doc.title}
        </h1>
        {/* Provenance, not a disclaimer: which version this is, when it took
            effect, and who released it. A reader disputing a term needs to be
            able to name the exact text they agreed to. */}
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-wide text-m3-on-surface-variant">
          <span>Version {doc.version_no}</span>
          <span aria-hidden="true">·</span>
          <span>Effective {formatPublished(doc.published_at)}</span>
          {doc.published_by_name ? (
            <>
              <span aria-hidden="true">·</span>
              <span>Published by {doc.published_by_name}</span>
            </>
          ) : null}
        </p>
      </header>

      <RichContent value={doc.body} format="markdown" className={POLICY_BODY_PROSE} />

      <nav className="mt-12 border-t border-m3-outline-variant/20 pt-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Other policies
        </h2>
        <SiblingPolicies current={doc.slug} />
      </nav>
    </PolicyShell>
  );
}
