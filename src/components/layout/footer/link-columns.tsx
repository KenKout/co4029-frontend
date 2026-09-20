import { Link } from "@tanstack/react-router";
import { MoveRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const LINK_CLASS =
  "hover:text-blue-400 transition-colors inline-flex items-center gap-2 group";
const ARROW_CLASS =
  "w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all";

/**
 * Footer link columns.
 *
 * Every entry here must resolve to a real route. There used to be a
 * `FooterPlaceholderLink` helper rendering `href="#"` for destinations that did
 * not exist yet; it was removed along with its five call sites, because a link
 * that goes nowhere costs more trust on the landing page — the one page whose
 * job is to convince a stranger — than the missing entry ever did. `href="#"`
 * is also focusable and announced as a link, so it wastes a screen-reader
 * user's time and then scrolls them to the top.
 *
 * `footer-links.test.ts` fails the build if a dead anchor comes back.
 *
 * Note: /courses and /catalog/career-paths sit behind the auth gate, so a
 * signed-out visitor is redirected to /login. That is intended — the gate
 * preserves the destination in `next`, so they land where they meant to go
 * once signed in.
 */

export function FooterPlatformColumn() {
  const { t } = useTranslation();
  return (
    <div className="lg:col-span-3">
      <h4 className="font-semibold text-white mb-6 tracking-wide text-sm uppercase">
        {t("footer.platform")}
      </h4>
      <ul className="space-y-3 text-sm text-slate-400">
        <li>
          <Link to="/courses" className={LINK_CLASS}>
            <MoveRight className={ARROW_CLASS} /> {t("footer.course_library")}
          </Link>
        </li>
        <li>
          <Link to="/catalog/career-paths" className={LINK_CLASS}>
            <MoveRight className={ARROW_CLASS} /> {t("footer.learning_paths")}
          </Link>
        </li>
      </ul>
    </div>
  );
}

export function FooterSupportColumn() {
  const { t } = useTranslation();
  return (
    <div className="lg:col-span-3">
      <h4 className="font-semibold text-white mb-6 tracking-wide text-sm uppercase">
        {t("footer.support")}
      </h4>
      <ul className="space-y-3 text-sm text-slate-400">
        <li>
          <Link to="/help" className={LINK_CLASS}>
            <MoveRight className={ARROW_CLASS} /> {t("footer.help_center")}
          </Link>
        </li>
      </ul>
    </div>
  );
}
