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

/**
 * Full document rhythm for Markdown authoring previews.
 */
export const MARKDOWN_DOCUMENT_CLASS =
  "[&_h1]:mb-4 [&_h1]:mt-7 [&_h1]:font-headline [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight " +
  "[&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:font-headline [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-snug " +
  "[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-headline [&_h3]:text-xl [&_h3]:font-semibold " +
  "[&_h1:first-child]:mt-0 [&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0 " +
  "[&_p]:my-3 [&_p]:leading-7 " +
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 " +
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 " +
  "[&_li]:pl-1 [&_li>p]:my-1 " +
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-m3-primary/30 " +
  "[&_blockquote]:bg-m3-primary/5 [&_blockquote]:px-4 [&_blockquote]:py-1 [&_blockquote]:italic " +
  "[&_strong]:font-bold [&_em]:italic " +
  "[&_a]:font-medium [&_a]:text-m3-primary [&_a]:underline [&_a]:underline-offset-2 " +
  "[&_code]:rounded [&_code]:bg-m3-surface-container-high [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_code]:text-m3-primary " +
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-100 " +
  "[&_img]:my-5 [&_img]:max-w-full [&_img]:rounded-xl " +
  "[&_hr]:my-6 [&_hr]:border-m3-outline-variant/30";

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
