import { HelpCircle } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";

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
    <SearchInput
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onClear={() => setQuery("")}
      clearLabel="Clear search"
      placeholder="Search help…"
      aria-label="Search help"
      wrapperClassName="mb-8"
      className="border-m3-outline-variant/40 bg-m3-surface-container-low"
    />
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
