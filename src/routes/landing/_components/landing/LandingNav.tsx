import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { scrollToLandingAnchor } from "./landing-scroll";
import { useLandingCopy } from "./use-landing-copy";

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const { c } = useLandingCopy();
  const sections = [
    { href: "#how-it-works", label: c.nav.how },
    { href: "#for-educators", label: c.nav.audience },
    { href: "#faq", label: c.nav.faq },
  ];
  return (
    <header
      className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          document.getElementById("landing-menu-toggle")?.focus();
        }
      }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-10 focus:rounded-lg focus:bg-background focus:p-3"
      >
        {c.nav.skip}
      </a>
      <nav
        aria-label={c.nav.main}
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
      >
        <Link
          to="/"
          className="font-headline text-2xl font-extrabold tracking-tight text-primary"
        >
          aBridgeAI<span className="text-amber-600">.</span>
        </Link>
        <div className="hidden items-center gap-6 text-sm font-medium text-text-muted lg:flex">
          {sections.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={scrollToLandingAnchor}
              className="hover:text-primary"
            >
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <Link
            to="/login"
            search={{ next: undefined }}
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-text-body"
          >
            {c.nav.signIn}
          </Link>
          <a
            href="#sample-workflow"
            onClick={scrollToLandingAnchor}
            className={cn(
              buttonVariants(),
              "hidden h-11 gap-2 px-4 sm:inline-flex",
            )}
          >
            {c.nav.workflow} <ArrowUpRight aria-hidden="true" />
          </a>
          <Button
            variant="outline"
            id="landing-menu-toggle"
            type="button"
            aria-label={open ? c.nav.close : c.nav.open}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen(!open)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-text-body lg:hidden"
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </nav>
      <nav
        id="landing-mobile-menu"
        aria-label={c.nav.mobile}
        hidden={!open}
        className="border-t border-border bg-background px-4 py-3 lg:hidden"
      >
        {sections.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            onClick={(event) => {
              setOpen(false);
              scrollToLandingAnchor(event);
            }}
            className="block rounded-lg px-3 py-3 text-sm font-medium text-text-body hover:bg-muted"
          >
            {label}
          </a>
        ))}
        <a
          href="#sample-workflow"
          onClick={(event) => {
            setOpen(false);
            scrollToLandingAnchor(event);
          }}
          className="block rounded-lg px-3 py-3 text-sm font-semibold text-primary"
        >
          {c.nav.workflow}
        </a>
        <div className="mt-2 border-t border-border px-1 pt-3">
          <LanguageSwitcher onLanguageChange={() => setOpen(false)} />
        </div>
      </nav>
    </header>
  );
}
