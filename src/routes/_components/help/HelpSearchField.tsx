import { HelpCircle, Search, X } from "lucide-react";

export function HelpPageHeader() {
  return (
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
  );
}

export function HelpSearchField({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (next: string) => void;
}) {
  return (
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
  );
}

export function HelpNoResults({ query }: { query: string }) {
  return (
    <div className="rounded-xl border border-dashed border-m3-outline-variant/40 p-10 text-center">
      <p className="text-sm font-medium text-m3-on-surface">
        No help topics match “{query}”.
      </p>
      <p className="mt-1 text-xs text-m3-on-surface-variant">
        Try a different word, or ask your course teacher or administrator.
      </p>
    </div>
  );
}
