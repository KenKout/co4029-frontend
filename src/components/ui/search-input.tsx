import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "@/components/ui/input";

/**
 * Search text input with a leading magnifier icon (and an optional trailing
 * clear button). Consolidates the `<div className="relative"><Search absolute
 * left-3 .../><Input pl-9 .../></div>` block repeated across the list pages.
 *
 * The magnifier and its padding now come from `Input`'s `startAdornment`
 * rather than being positioned here: this component used to be a second,
 * parallel implementation of the same wrapper, so the two drifted (the icon
 * colour and the reserved padding no longer matched what `endAdornment`
 * did). What is left is the part that is genuinely search-specific — which
 * icon, and the clear button.
 *
 * Per-page variation is preserved via props: the outer wrapper width
 * (`wrapperClassName`, e.g. "max-w-md flex-1"), the icon colour
 * (`iconClassName`), and any extra Input classes (`className`). All other
 * `Input` props (value/onChange/placeholder/onKeyDown/id/size/…) pass through.
 */
export function SearchInput({
  wrapperClassName,
  iconClassName,
  className,
  onClear,
  clearLabel = "Clear search",
  ...inputProps
}: Omit<InputProps, "type" | "startAdornment"> & {
  wrapperClassName?: string;
  iconClassName?: string;
  /** When provided, shows a trailing clear button that calls this. */
  onClear?: () => void;
  clearLabel?: string;
}) {
  const showClear = onClear !== undefined && !!inputProps.value;
  const field = (
    <Input
      type="text"
      data-shortcut="search"
      startAdornment={
        <Search className={cn("text-text-muted", iconClassName)} />
      }
      // `startAdornment` makes Input render its own relative wrapper, so when
      // there is no clear button that wrapper is the only one needed.
      wrapperClassName={onClear === undefined ? wrapperClassName : undefined}
      className={cn(onClear && "pr-9", className)}
      {...inputProps}
    />
  );

  if (onClear === undefined) return field;

  return (
    <div className={cn("relative", wrapperClassName)}>
      {field}
      {showClear && (
        // Native <button>: this file is the design-system layer the system
        // Button is built on, and an absolutely-positioned 14px affordance
        // inside a field is not a Button-sized control.
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
