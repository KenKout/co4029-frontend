import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, HelpCircle, Search, X } from "lucide-react";

import { RichContent } from "@/components/ui/rich-content";
import {
  FAQ_CATEGORY_LABELS,
  FAQ_CATEGORY_ORDER,
  FAQ_ENTRIES,
  POLICY_DOCUMENTS,
  POLICY_ORDER,
  type FaqCategory,
} from "@/lib/help-content";
import { cn } from "@/lib/utils";

/**
 * Public help / FAQ page.
 *
 * Deliberately reachable WITHOUT authentication (hangs off the router's root,
 * not the `_authenticated` route): someone who can't sign in is exactly the
 * person who needs the help page, and gating it behind login would make the
 * "why can't I log in" answers unreachable.
 *
 * Search filters across question and answer text so a user who doesn't know the
 * right vocabulary ("EF", "spaced repetition") can still find the entry by
 * describing the symptom.
 */
export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const trimmed = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!trimmed) return FAQ_ENTRIES;
    return FAQ_ENTRIES.filter(
      (e) =>
        e.question.toLowerCase().includes(trimmed) ||
        e.answer.toLowerCase().includes(trimmed),
    );
  }, [trimmed]);

  const grouped = useMemo(() => {
    const map = new Map<FaqCategory, typeof FAQ_ENTRIES>();
    for (const entry of matches) {
      const list = map.get(entry.category) ?? [];
      list.push(entry);
      map.set(entry.category, list);
    }
    return map;
  }, [matches]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // While searching, expand everything: the user is scanning for a phrase and
  // shouldn't have to click each result open to see whether it's the right one.
  const isSearching = trimmed.length > 0;

  return (
    <div className="min-h-screen bg-m3-surface">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <header className="mb-8">
          <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-m3-primary-fixed">
            <HelpCircle className="h-5 w-5 text-m3-primary" />
          </span>
          <h1 className="font-headline text-3xl font-bold text-m3-on-surface">
            Help &amp; FAQ
          </h1>
          <p className="mt-2 text-sm text-m3-on-surface-variant">
            Common questions about courses, reviews, quizzes and interviews.
          </p>
        </header>

        {/* Search */}
        <div className="relative mb-8">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-m3-on-surface-variant"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help…"
            aria-label="Search help"
            className="w-full rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-low py-2.5 pl-10 pr-10 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant focus:border-m3-primary focus:outline-none focus:ring-2 focus:ring-m3-primary/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-m3-on-surface-variant hover:text-m3-on-surface"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-m3-outline-variant/40 p-10 text-center">
            <p className="text-sm font-medium text-m3-on-surface">
              No help topics match “{query}”.
            </p>
            <p className="mt-1 text-xs text-m3-on-surface-variant">
              Try a different word, or ask your course teacher or administrator.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {FAQ_CATEGORY_ORDER.filter((c) => grouped.has(c)).map(
              (category) => (
                <section key={category}>
                  <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                    {FAQ_CATEGORY_LABELS[category]}
                  </h2>
                  <div className="divide-y divide-m3-outline-variant/20 overflow-hidden rounded-xl border border-m3-outline-variant/30 bg-card">
                    {(grouped.get(category) ?? []).map((entry) => {
                      const open = isSearching || openIds.has(entry.id);
                      return (
                        <div key={entry.id} id={`q-${entry.id}`}>
                          <button
                            type="button"
                            onClick={() => toggle(entry.id)}
                            aria-expanded={open}
                            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-m3-surface-container-low"
                          >
                            <span className="text-sm font-medium text-m3-on-surface">
                              {entry.question}
                            </span>
                            <ChevronDown
                              aria-hidden="true"
                              className={cn(
                                "h-4 w-4 shrink-0 text-m3-on-surface-variant transition-transform",
                                open && "rotate-180",
                              )}
                            />
                          </button>
                          {open && (
                            <div className="px-5 pb-5">
                              <RichContent
                                value={entry.answer}
                                format="markdown"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ),
            )}
          </div>
        )}

        {/* Policies — the other half of what these pages are for, so link them
            rather than making the user hunt in the footer. */}
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

        <p className="mt-10 text-xs text-m3-on-surface-variant">
          Still stuck? Contact your course teacher, or your organisation&apos;s
          administrator for account and access problems.
        </p>
      </div>
    </div>
  );
}
