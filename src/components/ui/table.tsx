import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal, design-system-aligned table primitives (shadcn-style API).
 *
 * A single `<table>` owns column widths for the whole grid, so headers and
 * body cells always line up — unlike hand-rolled grid rows where each row
 * sizes its `auto` columns independently. `Table` wraps the element in an
 * `overflow-x-auto` container so wide tables scroll on narrow screens.
 *
 * `TableRow` intentionally ships no hover state: static tables stay quiet,
 * and interactive tables opt in with `className="hover:bg-… cursor-pointer"`.
 */

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      className={cn("w-full overflow-x-auto", containerClassName)}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:border-b [&_tr]:border-m3-outline-variant/20",
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-m3-outline-variant/25 transition-colors data-[state=selected]:bg-m3-surface-container-low",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-4 py-3 text-left align-middle text-[11px] font-bold uppercase tracking-widest whitespace-nowrap text-m3-on-surface-variant",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 py-2.5 align-middle", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-m3-on-surface-variant", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
