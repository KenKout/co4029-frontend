import { Link } from "@tanstack/react-router";
import { MoveRight } from "lucide-react";

const LINK_CLASS =
  "hover:text-blue-400 transition-colors inline-flex items-center gap-2 group";
const ARROW_CLASS =
  "w-3 h-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all";

/** Placeholder anchors kept verbatim: these targets do not exist yet. */
function FooterPlaceholderLink({ label }: { label: string }) {
  return (
    <a href="#" className={LINK_CLASS}>
      <MoveRight className={ARROW_CLASS} /> {label}
    </a>
  );
}

export function FooterPlatformColumn() {
  return (
    <div className="lg:col-span-2">
      <h4 className="font-semibold text-white mb-6 tracking-wide text-sm uppercase">
        Platform
      </h4>
      <ul className="space-y-3 text-sm text-slate-400">
        <li>
          <Link to="/courses" className={LINK_CLASS}>
            <MoveRight className={ARROW_CLASS} /> Course Library
          </Link>
        </li>
        <li>
          <FooterPlaceholderLink label="Learning Paths" />
        </li>
        <li>
          <FooterPlaceholderLink label="AI Assistant" />
        </li>
      </ul>
    </div>
  );
}

export function FooterSupportColumn() {
  return (
    <div className="lg:col-span-2">
      <h4 className="font-semibold text-white mb-6 tracking-wide text-sm uppercase">
        Support
      </h4>
      <ul className="space-y-3 text-sm text-slate-400">
        <li>
          <FooterPlaceholderLink label="Instructors" />
        </li>
        <li>
          <FooterPlaceholderLink label="Help Center" />
        </li>
        <li>
          <FooterPlaceholderLink label="Contact Us" />
        </li>
      </ul>
    </div>
  );
}
