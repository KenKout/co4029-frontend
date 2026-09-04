import { useEffect } from "react";
import { TAB_BY_PARAM } from "./constants";
import type { Tab } from "./types";

/**
 * Open the below-the-player tab named by `?tab=`.
 *
 * The course-discussion notification links to
 * `/courses/<slug>/learn?item=<lesson-slug>&tab=discussion`; without this the
 * recipient landed on the right lesson but on the default Lesson Notes tab and
 * had to find "Discussion" themselves.
 *
 * Keyed on the param rather than firing once on mount, so following a second
 * notification while the page is already open still switches tabs. An
 * unrecognised value is ignored (the current tab stands) — a renamed tab set
 * must not break links already sitting in someone's inbox.
 *
 * Lives in its own module because folding the effect into the page component
 * pushed it past the repo's max-lines-per-function cap.
 */
export function useTabDeepLink(
  requested: string | undefined,
  setActiveTab: (tab: Tab) => void,
): void {
  useEffect(() => {
    if (!requested) return;
    const mapped = TAB_BY_PARAM[requested.toLowerCase()];
    if (mapped) setActiveTab(mapped);
    // setActiveTab is a useState setter (stable); excluding it keeps this from
    // re-running on every render of the page component.
     
  }, [requested]);
}
