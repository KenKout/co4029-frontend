import TopNavBar from "@/components/layout/TopNavBar";
import Footer from "@/components/layout/Footer";
import FaqAccordion from "./_components/help/FaqAccordion";
import {
  HelpNoResults,
  HelpPageHeader,
  HelpSearchField,
} from "./_components/help/HelpSearchField";
import PolicyLinks from "./_components/help/PolicyLinks";
import { useFaqSearch } from "./_components/help/use-faq-search";

/**
 * Public help / FAQ page.
 *
 * Deliberately reachable WITHOUT authentication (hangs off the router's root,
 * not the `_authenticated` route): someone who can't sign in is exactly the
 * person who needs the help page, and gating it behind login would make the
 * "why can't I log in" answers unreachable.
 */
export default function HelpPage() {
  const { query, setQuery, matches, grouped, toggle, openIds, isSearching } =
    useFaqSearch();

  return (
    // TopNavBar (not ContentTopBar): these routes are public, and ContentTopBar
    // assumes an authenticated user. TopNavBar already branches on
    // isAuthenticated, so a signed-in visitor keeps their avatar/notifications
    // and a signed-out one gets sign-in actions.
    <div className="min-h-screen bg-m3-surface flex flex-col">
      <TopNavBar />
      <div className="mx-auto w-full max-w-3xl flex-1 px-5 pb-12 pt-28 sm:px-8">
        <HelpPageHeader />

        {/* Search */}
        <HelpSearchField query={query} setQuery={setQuery} />

        {matches.length === 0 ? (
          <HelpNoResults query={query} />
        ) : (
          <FaqAccordion
            grouped={grouped}
            openIds={openIds}
            isSearching={isSearching}
            toggle={toggle}
          />
        )}

        <PolicyLinks />

        <p className="mt-10 text-xs text-m3-on-surface-variant">
          Still stuck? Contact your course teacher, or your organisation&apos;s
          administrator for account and access problems.
        </p>
      </div>
      <Footer />
    </div>
  );
}
