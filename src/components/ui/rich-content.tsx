import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";

/**
 * Renders quiz rich content per its backend format discriminator (Phase 3).
 *
 * The backend stores a per-field ``*_format`` alongside each text column and
 * sanitizes markdown/html on write (nh3), so by the time content reaches here
 * it is already safe:
 *
 * - ``plain``    → rendered as escaped text (never parsed as markup). Newlines
 *   preserved via ``whitespace-pre-wrap``.
 * - ``markdown`` → rendered with ReactMarkdown (matches the lesson-notes
 *   convention). Wrapped in a compact ``prose`` block.
 * - ``html``     → the string is already nh3-sanitized server-side, so it is
 *   safe to inject. We still scope it inside a ``prose`` container.
 *
 * Unknown/absent format falls back to ``plain`` — the safest default.
 */
export function RichContent({
  value,
  format,
  className,
  inline = false,
}: {
  value: string | null | undefined;
  format?: string | null;
  className?: string;
  /** When true, use a tighter wrapper (no prose block margins). */
  inline?: boolean;
}) {
  const text = value ?? "";
  if (!text) return null;

  const fmt = format ?? "plain";

  if (fmt === "markdown") {
    return (
      <div
        className={cn(
          "prose prose-sm max-w-none prose-headings:font-headline prose-headings:text-m3-on-surface prose-p:text-m3-on-surface prose-a:text-m3-primary prose-code:text-m3-primary",
          inline && "prose-p:my-0",
          className,
        )}
      >
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }

  if (fmt === "html") {
    // Content is nh3-sanitized on write (backend Phase 3), safe to inject.
    return (
      <div
        className={cn(
          "prose prose-sm max-w-none prose-headings:font-headline prose-headings:text-m3-on-surface prose-p:text-m3-on-surface prose-a:text-m3-primary",
          inline && "prose-p:my-0",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  // plain (default) — escaped text, newlines preserved.
  return <span className={cn("whitespace-pre-wrap", className)}>{text}</span>;
}
