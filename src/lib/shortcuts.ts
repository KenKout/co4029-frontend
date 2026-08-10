/**
 * Global keyboard-shortcut registry (QoL).
 *
 * Central definition of every app-wide shortcut: the palette (Ctrl+Shift+P)
 * renders this list, and the GlobalShortcuts keydown handler matches events
 * against it. Actions are DOM-based on purpose — they target data-attributes
 * that the shared UI primitives (SearchInput, FilterBar, Tabs,
 * DataTablePagination, avatar trigger) expose, so pages need zero changes to
 * participate.
 *
 * Guard rule: only the palette combo (Ctrl+Shift+P) fires while the user is
 * typing inside an editable element. Everything else is skipped there so
 * native text-editing shortcuts (Ctrl+Shift+←/→ = select word, …) keep
 * working — that is exactly the VS Code behaviour users expect.
 */

export type ShortcutCategory =
  | "general"
  | "search"
  | "filters"
  | "tabs"
  | "pagination";

export interface ShortcutDef {
  id: string;
  /** Human-readable combo, shown in the palette. */
  combo: string;
  /** i18n key for the label. */
  labelKey: string;
  category: ShortcutCategory;
  /** Whether this keydown event triggers the shortcut. */
  match: (e: KeyboardEvent) => boolean;
  /** The action. Runs with the matching event (already preventDefaulted). */
  run: (e: KeyboardEvent) => void;
}

function isEditableTarget(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/** Ctrl+Shift+<key> where key is a plain letter/digit (case-insensitive). */
function ctrlShiftKey(key: string) {
  return (e: KeyboardEvent) =>
    e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey &&
    e.key.toLowerCase() === key;
}

/** Ctrl+Shift+ArrowLeft / ArrowRight (pagination). */
function ctrlShiftArrow(dir: "ArrowLeft" | "ArrowRight") {
  return (e: KeyboardEvent) =>
    e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.key === dir;
}

function clickFirst(selector: string): boolean {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return false;
  el.click();
  return true;
}

function focusFirst(selector: string): boolean {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return false;
  el.focus({ preventScroll: false });
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}

/** Click the Nth tab (1-based) of the first top-level tab strip. */
function clickTab(index: number): boolean {
  const strip = document.querySelector<HTMLElement>('[data-shortcut="tabs"]');
  if (!strip) return false;
  const tab = strip.querySelector<HTMLElement>(
    `[data-tab-index="${index}"]`,
  );
  if (!tab) return false;
  tab.click();
  return true;
}

export interface ShortcutRegistry {
  /** The palette combo itself — always fires, even inside inputs. */
  paletteCombo: (e: KeyboardEvent) => boolean;
  /** All shortcuts, in palette display order. */
  shortcuts: ShortcutDef[];
  /** Whether the event target is a text-editing element. */
  isEditableTarget: (e: KeyboardEvent) => boolean;
}

/** Extract the digit from a Ctrl+Shift+1..9 event (null when not a digit). */
function digitOf(e: KeyboardEvent): number | null {
  if (!(e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey)) return null;
  if (e.key.length !== 1 || e.key < "1" || e.key > "9") return null;
  return Number(e.key);
}

export function buildRegistry(opts: {
  onTogglePalette: () => void;
}): ShortcutRegistry {
  const { onTogglePalette } = opts;

  const shortcuts: ShortcutDef[] = [
    {
      id: "open-palette",
      combo: "Ctrl+Shift+P",
      labelKey: "shortcuts.open_palette",
      category: "general",
      match: (e) => e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey &&
        e.key.toLowerCase() === "p",
      run: () => onTogglePalette(),
    },
    {
      id: "focus-search",
      combo: "Ctrl+Shift+F",
      labelKey: "shortcuts.focus_search",
      category: "search",
      match: ctrlShiftKey("f"),
      run: () => void focusFirst('[data-shortcut="search"]'),
    },
    {
      id: "focus-filters",
      combo: "Ctrl+Shift+L",
      labelKey: "shortcuts.focus_filters",
      category: "filters",
      match: ctrlShiftKey("l"),
      run: () => {
        // Focus the first filter control (a Select trigger) inside the first
        // filter bar. The trigger is a <button>, so Enter opens its popup.
        const bar = document.querySelector<HTMLElement>(
          '[data-shortcut="filters"]',
        );
        const trigger = bar?.querySelector<HTMLElement>("button");
        if (trigger) {
          trigger.focus({ preventScroll: false });
          trigger.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      },
    },
    // Tabs 1-9: one def, matched by digitOf(). run receives the event so it
    // knows which digit was pressed.
    {
      id: "tab-switch",
      combo: "Ctrl+Shift+1…9",
      labelKey: "shortcuts.tab_switch",
      category: "tabs",
      match: (e) => digitOf(e) !== null,
      run: (e) => {
        const n = digitOf(e);
        if (n !== null) void clickTab(n);
      },
    },
    {
      id: "pagination-prev",
      combo: "Ctrl+Shift+←",
      labelKey: "shortcuts.pagination_prev",
      category: "pagination",
      match: ctrlShiftArrow("ArrowLeft"),
      run: () => void clickFirst('[data-shortcut="pagination-prev"]'),
    },
    {
      id: "pagination-next",
      combo: "Ctrl+Shift+→",
      labelKey: "shortcuts.pagination_next",
      category: "pagination",
      match: ctrlShiftArrow("ArrowRight"),
      run: () => void clickFirst('[data-shortcut="pagination-next"]'),
    },
    {
      id: "user-menu",
      combo: "",
      labelKey: "shortcuts.user_menu",
      category: "general",
      // No keyboard combo — reachable from the palette only.
      match: () => false,
      run: () => void clickFirst('[aria-label="User menu"]'),
    },
  ];

  return {
    paletteCombo: (e) =>
      e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey &&
      e.key.toLowerCase() === "p",
    shortcuts,
    isEditableTarget,
  };
}

export type { ShortcutDef as Shortcut };
