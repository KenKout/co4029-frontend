import { Link } from "@tanstack/react-router";
import { topNavLinks } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function TopNavLinks({ pathname }: { pathname: string }) {
  return (
    <div className="hidden md:flex gap-2 items-center">
      {topNavLinks.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          className={cn(
            "font-heading tracking-tight text-sm font-semibold transition-all duration-200 cursor-pointer",
            "px-3 py-1.5 rounded-md hover:bg-m3-primary-fixed/40 hover:opacity-90",
            pathname === link.href
              ? "text-primary"
              : "text-text-muted hover:text-primary",
          )}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
