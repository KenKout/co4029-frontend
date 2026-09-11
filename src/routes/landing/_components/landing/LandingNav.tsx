import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sections = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#for-educators", label: "Who it helps" },
  { href: "#faq", label: "FAQ" },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);
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
        Skip to content
      </a>
      <nav
        aria-label="Main navigation"
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
            <a key={href} href={href} className="hover:text-primary">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/login"
            search={{ next: undefined }}
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-text-body"
          >
            Sign in
          </Link>
          <a
            href="#sample-workflow"
            className={cn(
              buttonVariants(),
              "hidden h-11 gap-2 px-4 sm:inline-flex",
            )}
          >
            See the workflow <ArrowUpRight aria-hidden="true" />
          </a>
          <Button
            variant="outline"
            id="landing-menu-toggle"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
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
        aria-label="Mobile navigation"
        hidden={!open}
        className="border-t border-border bg-background px-4 py-3 lg:hidden"
      >
        {sections.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-3 text-sm font-medium text-text-body hover:bg-muted"
          >
            {label}
          </a>
        ))}
        <a
          href="#sample-workflow"
          onClick={() => setOpen(false)}
          className="block rounded-lg px-3 py-3 text-sm font-semibold text-primary"
        >
          See the workflow
        </a>
      </nav>
    </header>
  );
}
