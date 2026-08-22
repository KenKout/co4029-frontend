import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import type { FlatItem } from "./types";

/**
 * URL-derived state for the student course-learn screen: the deep-link targets
 * (?t= seek, ?p= page, #anchor), the router handles the page needs to navigate
 * with, and the progress summary the course-home CTA is built from.
 *
 * The hook keeps the page shell's original hook call order — search, navigate,
 * location, player ref, then the derived memos — so effects still fire in the
 * same sequence they did when this all lived in the component body.
 */

export interface LearnSearch {
  t?: string | number;
  p?: string | number;
  item?: string;
}

export interface LearnUrlState {
  search: LearnSearch;
  navigate: ReturnType<typeof useNavigate>;
  playerRef: RefObject<HTMLDivElement | null>;
  seekSeconds: number | null;
  targetPage: number | null;
  targetAnchor: string | null;
  resumeIdx: number;
  completedCount: number;
}

export function useLearnUrlState(
  lessonItems: FlatItem[],
  lessonStatusMap: Map<string, string>,
): LearnUrlState {
  const search = useSearch({ strict: false }) as LearnSearch;
  const navigate = useNavigate();
  const { hash } = useLocation();
  const playerRef = useRef<HTMLDivElement | null>(null);

  const seekSeconds = useMemo(() => {
    if (search.t === undefined || search.t === null) return null;
    const n = Number(search.t);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [search.t]);

  const targetPage = useMemo(() => {
    if (search.p === undefined || search.p === null) return null;
    const n = Number(search.p);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
  }, [search.p]);

  const targetAnchor = useMemo(
    () => (hash ? hash.replace(/^#/, "") : null),
    [hash],
  );

  // Resume target = first non-completed lesson (falls back to the first).
  const resumeIdx = useMemo(() => {
    const i = lessonItems.findIndex((li) => {
      const id = li.item.target?.id;
      return !id || lessonStatusMap.get(id) !== "completed";
    });
    return i >= 0 ? i : 0;
  }, [lessonItems, lessonStatusMap]);

  const completedCount = useMemo(
    () =>
      lessonItems.filter(
        (li) => lessonStatusMap.get(li.item.target?.id ?? "") === "completed",
      ).length,
    [lessonItems, lessonStatusMap],
  );

  return {
    search,
    navigate,
    playerRef,
    seekSeconds,
    targetPage,
    targetAnchor,
    resumeIdx,
    completedCount,
  };
}

/**
 * Applies the ?t= / ?p= / #anchor deep-link to whatever the player container
 * happens to hold (a media element, a PDF iframe, or an anchored article).
 */
export function useApplyDeepLink({
  playerRef,
  activeLessonId,
  seekSeconds,
  targetPage,
  targetAnchor,
}: {
  playerRef: RefObject<HTMLDivElement | null>;
  activeLessonId: string | undefined;
  seekSeconds: number | null;
  targetPage: number | null;
  targetAnchor: string | null;
}) {
  useEffect(() => {
    const container = playerRef.current;
    if (!container) return;

    if (seekSeconds !== null) {
      const media = container.querySelector<HTMLMediaElement>("video, audio");
      if (media) {
        const apply = () => {
          try {
            media.currentTime = seekSeconds;
          } catch {
            // ignore — seek before metadata loaded
          }
        };
        if (media.readyState >= 1) apply();
        else media.addEventListener("loadedmetadata", apply, { once: true });
      }
    }

    if (targetPage !== null) {
      const iframe = container.querySelector<HTMLIFrameElement>("iframe");
      if (iframe) {
        try {
          const u = new URL(iframe.src, window.location.origin);
          u.hash = `page=${targetPage}`;
          if (iframe.src !== u.toString()) iframe.src = u.toString();
        } catch {
          // ignore — non-URL src
        }
        iframe.dataset.page = String(targetPage);
      }
    }

    if (targetAnchor) {
      const el = container.querySelector(`#${CSS.escape(targetAnchor)}`);
      if (el && "scrollIntoView" in el) {
        (el as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  }, [activeLessonId, seekSeconds, targetPage, targetAnchor]);
}
