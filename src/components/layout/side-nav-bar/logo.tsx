import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function SideNavLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "h-16 flex items-center border-b border-border px-4 shrink-0",
        collapsed ? "justify-center" : "justify-start",
      )}
    >
      {collapsed ? (
        <Link
          to="/"
          className="text-base font-bold text-primary tracking-tight font-heading cursor-pointer"
        >
          aB
        </Link>
      ) : (
        <Link to="/" className="flex flex-col cursor-pointer min-w-0">
          <span className="text-lg font-bold text-primary tracking-tight font-heading">
            aBridgeAI
          </span>
          <span className="text-[9px] uppercase tracking-widest text-text-subtle">
            The Cognitive Conduit
          </span>
        </Link>
      )}
    </div>
  );
}
