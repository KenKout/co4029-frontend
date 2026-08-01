import { Link } from "@tanstack/react-router";
import { FooterBottomBar } from "./footer/bottom-bar";
import { FooterBrandColumn } from "./footer/brand-column";
import {
  FooterPlatformColumn,
  FooterSupportColumn,
} from "./footer/link-columns";
import { FooterNewsletterColumn } from "./footer/newsletter-column";

export default function Footer() {
  return (
    <footer className="relative bg-[#0b1120] border-t border-white/10 overflow-hidden text-slate-300">
      {/* High-tech background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[80px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand Column */}
          <FooterBrandColumn />

          {/* Links Columns */}
          <FooterPlatformColumn />

          <FooterSupportColumn />

          {/* Newsletter Column */}
          <FooterNewsletterColumn />
        </div>
      </div>

      <FooterBottomBar>
        {/* These three were dead `href="#"` anchors. They now resolve to the
            public policy pages. */}
        <Link
          className="hover:text-white transition-colors"
          to="/policy/$slug"
          params={{ slug: "privacy" }}
        >
          Privacy Policy
        </Link>
        <Link
          className="hover:text-white transition-colors"
          to="/policy/$slug"
          params={{ slug: "terms" }}
        >
          Terms of Service
        </Link>
        <Link
          className="hover:text-white transition-colors"
          to="/policy/$slug"
          params={{ slug: "cookies" }}
        >
          Cookie Policy
        </Link>
        <Link className="hover:text-white transition-colors" to="/help">
          Help
        </Link>
      </FooterBottomBar>
    </footer>
  );
}
