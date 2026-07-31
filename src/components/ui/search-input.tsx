import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "@/components/ui/input";

/**
 * Search text input with a leading magnifier icon (and an optional trailing
 * clear button). Consolidates the `<div className="relative"><Search absolute
 * left-3 .../><Input pl-9 .../></div>` block repeated across the list pages.
 *
 * Per-page variation is preserved via props: the outer wrapper width
 * (`wrapperClassName`, e.g. "max-w-md flex-1"), the icon colour
 * (`iconClassName`), and any extra Input classes (`className`). All other
 * `Input` props (value/onChange/placeholder/onKeyDown/id/…) pass through.
 *
 * The left padding is fixed at `pl-9` to sit clear of the `left-3 h-4 w-4`
 * icon; pass `onClear` to render the trailing X (adds `pr-9`).
 */
export function SearchInput({
  wrapperClassName,
  iconClassName,
  className,
  onClear,
  clearLabel = "Clear search",
  ...inputProps
}: Omit<InputProps, "type"> & {
  wrapperClassName?: string;
  iconClassName?: string;
  /** When provided, shows a trailing clear button that calls this. */
  onClear?: () => void;
  clearLabel?: string;
}) {
  const showClear = onClear !== undefined && !!inputProps.value;
  return (
    <div className={cn("relative", wrapperClassName)}>
      <Search
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-text-muted",
          iconClassName,
        )}
      />
      <Input
        type="text"
        className={cn("pl-9", onClear && "pr-9", className)}
        {...inputProps}
      />
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-foreground cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
