import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
 * - ``markdown`` → rendered with ReactMarkdown **plus GitHub-Flavoured
 *   Markdown**, wrapped in a compact ``prose`` block. GFM is what supplies
 *   tables, strikethrough, task lists and bare-URL autolinking; react-markdown
 *   on its own implements CommonMark, which has none of them. Without it a
 *   pipe table was parsed as one ordinary paragraph and rendered as a wall of
 *   literal ``|`` characters — which is exactly how the published policy pages
 *   were displaying their tables.
 * - ``html``     → the string is already nh3-sanitized server-side, so it is
 *   safe to inject. We still scope it inside a ``prose`` container.
 *
 * Unknown/absent format falls back to ``plain`` — the safest default.
 */
/** Table styling shared by every markdown surface. Written as element-scoped
 *  utilities rather than a `prose-table:` variant so the rules reach the cells
 *  as well as the table element. */
const TABLE_PROSE =
  "[&_table]:my-4 [&_table]:w-full [&_table]:block [&_table]:overflow-x-auto " +
  "[&_table]:border-collapse [&_table]:text-sm " +
  "[&_thead]:bg-m3-surface-container " +
  "[&_th]:border [&_th]:border-m3-outline-variant/50 [&_th]:px-3 [&_th]:py-2 " +
  "[&_th]:text-left [&_th]:font-semibold " +
  "[&_td]:border [&_td]:border-m3-outline-variant/40 [&_td]:px-3 [&_td]:py-2 " +
  "[&_td]:align-top";

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
          TABLE_PROSE,
          inline && "prose-p:my-0",
          className,
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
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
