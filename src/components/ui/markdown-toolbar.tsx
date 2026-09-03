import { Button } from "@/components/ui/button";
/**
 * Shared markdown-textarea editing helpers: a small toolbar button and a
 * factory that wires inline (`**bold**`) and block (`- ` / `# `) markdown
 * insertion to a textarea ref + its controlled value.
 *
 * Used by the video- and reading-type lesson content editors and by the admin
 * policy editor. It lives in `components/ui` rather than under one of those
 * route trees so none of them has to import another's internals.
 */

/** A single icon button in a markdown editor toolbar. */
export function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Button variant="ghost"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="p-2 rounded-lg transition-colors text-m3-on-surface-variant cursor-pointer hover:bg-m3-surface-container-high h-auto whitespace-normal"
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

/**
 * Build markdown-insertion helpers bound to a textarea. `applyMarkdown` wraps
 * the current selection with `before`/`after` (e.g. `**` … `**`); `applyBlock`
 * prefixes each selected line (e.g. `- ` or `# `). Both preserve/restore the
 * selection after mutating the controlled value.
 */
export function makeMarkdownApplier(
  getRef: () => HTMLTextAreaElement | null,
  getNotes: () => string,
  setNotes: (v: string) => void,
) {
  function applyMarkdown(before: string, after = before) {
    const el = getRef();
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = getNotes().slice(start, end);
    const inserted = before + selected + after;
    setNotes(getNotes().slice(0, start) + inserted + getNotes().slice(end));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    }, 0);
  }

  function applyBlock(prefix: string) {
    const el = getRef();
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = getNotes().slice(start, end);
    const lines = selected
      ? selected
          .split("\n")
          .map((l) => prefix + l)
          .join("\n")
      : prefix;
    setNotes(getNotes().slice(0, start) + lines + getNotes().slice(end));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + lines.length);
    }, 0);
  }

  return { applyMarkdown, applyBlock };
}
