import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, FileText, ScrollText, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import TopNavBar from "@/components/layout/TopNavBar";
import Footer from "@/components/layout/Footer";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SearchInput } from "@/components/ui/search-input";
import { useReaderPolicies } from "./_components/use-reader-policies";
import { cn } from "@/lib/utils";

/**
 * The signed-in policy catalog — every document this reader is a party to.
 *
 * Reachable from the sidebar (below Help) at /policies. The reader endpoints
 * are the same unauthenticated ones the public /policy/$slug pages use;
 * audience scoping is a courtesy filter, so this page adds zero access
 * control and needs no extra endpoint — the index just works for whatever
 * roles the viewer holds (an anonymous visitor gets the public set only;
 * the audience is literal, so a policy named for students is for students).
 */
export default function PoliciesPage() {
  const { t } = useTranslation();
  // The reader's own roles, not []: an empty list is the ANONYMOUS request,
  // and a signed-in student would lose every policy named for them.
  const { data, isPending } = useReaderPolicies();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | "legal" | "academic">("all");

  const filtered = useMemo(() => {
    const all = data ?? [];
    const q = query.trim().toLowerCase();
    return all.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!q || p.title.toLowerCase().includes(q)),
    );
  }, [data, query, category]);

  const CATEGORIES = [
    { key: "all" as const, label: t("policies_page.filter.all") },
    { key: "legal" as const, label: t("policies_page.filter.legal") },
    { key: "academic" as const, label: t("policies_page.filter.academic") },
  ];

  return (
    // Same public chrome as /help: TopNavBar (works signed-out; it branches
    // on auth itself) + Footer, content in a centered column below the
    // fixed 64px bar.
    <div className="min-h-screen bg-m3-surface flex flex-col">
      <TopNavBar />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-28 sm:px-6">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-m3-primary-fixed">
            <ScrollText className="h-5 w-5 text-m3-primary" />
          </span>
        </div>
        <h1 className="font-headline font-black text-4xl text-m3-on-surface leading-none tracking-tight">
          {t("policies_page.title")}
        </h1>
        <p className="mt-3 text-m3-on-surface-variant text-base max-w-xl">
          {t("policies_page.intro")}
        </p>
      </header>

      {/* Toolbar: search + category filter, sticky under the fixed TopNavBar. */}
      <div className="sticky top-16 z-10 -mx-4 px-4 py-3 mt-6 border-b border-m3-outline-variant/20 bg-white/90 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-outline pointer-events-none" />
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={query ? () => setQuery("") : undefined}
              placeholder={t("policies_page.search_placeholder")}
              aria-label={t("policies_page.search_placeholder")}
              wrapperClassName="w-full"
            />
          </div>
          <div
            role="tablist"
            aria-label={t("policies_page.filter_aria")}
            className="inline-flex rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-lowest p-1 gap-1"
          >
            {CATEGORIES.map((c) => (
              <Button
                key={c.key}
                variant="ghost"
                type="button"
                role="tab"
                aria-selected={category === c.key}
                onClick={() => setCategory(c.key)}
                className={cn(
                  "h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                  category === c.key
                    ? "bg-m3-primary text-white shadow-sm hover:bg-m3-primary/90 hover:text-white"
                    : "text-m3-on-surface-variant hover:bg-m3-surface-container",
                )}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-6">
        {isPending ? (
          <PageSkeleton rows={3} rounded="rounded-xl" />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-m3-outline-variant/40 p-10 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-m3-outline/40" />
            <p className="text-sm font-semibold text-m3-on-surface">
              {data?.length
                ? t("policies_page.empty_filtered_title")
                : t("policies_page.empty_title")}
            </p>
            <p className="mt-1 text-xs text-m3-on-surface-variant">
              {data?.length
                ? t("policies_page.empty_filtered_body")
                : t("policies_page.empty_body")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <Link
                key={p.slug}
                to="/policy/$slug"
                params={{ slug: p.slug }}
                className="group bg-card rounded-xl overflow-hidden shadow-editorial ghost-border p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-glass"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-m3-primary-fixed">
                    <FileText className="h-4.5 w-4.5 text-m3-primary" />
                  </span>
                  <span className="rounded-full bg-m3-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
                    {t(`policies_page.category_${p.category}`)}
                  </span>
                </div>
                <h2 className="font-headline font-semibold text-m3-on-surface leading-snug line-clamp-2">
                  {p.title}
                </h2>
                <p className="text-xs text-m3-on-surface-variant mt-auto flex items-center justify-between">
                  <span>
                    {t("policies_page.version_n", { version: p.version_no })}
                  </span>
                  <ChevronRight className="h-4 w-4 text-m3-outline transition-colors group-hover:text-m3-primary" />
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
      </div>
      <Footer />
    </div>
  );
}
