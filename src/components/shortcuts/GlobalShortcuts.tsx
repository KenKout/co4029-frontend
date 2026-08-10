import { useCallback, useEffect, useMemo, useState } from "react";
import { buildRegistry, PALETTE_OPEN_EVENT } from "@/lib/shortcuts";
import { CommandPalette } from "./CommandPalette";

/**
 * App-wide keyboard shortcuts (QoL).
 *
 * Mounted once inside the authenticated shell (AppShell). Listens for the
 * registered combos, prevents their default browser behaviour, and runs the
 * matching action. Ctrl+Shift+P opens the quick-shortcut palette, which lists
 * every shortcut (and lets the user trigger the DOM-attribute actions by
 * clicking).
 *
 * Editable guard: while the user is typing in an input/textarea/contenteditable,
 * only the palette combo fires — the other combos are left alone so native
 * text-editing keys (Ctrl+Shift+←/→ = select word, Ctrl+Shift+Home/End, …)
 * keep their meaning. This mirrors VS Code's behaviour.
 */
export function GlobalShortcuts() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  const togglePalette = useCallback(() => {
    setPaletteOpen((open) => !open);
  }, []);

  const registry = useMemo(() => buildRegistry({ onTogglePalette: togglePalette }), [togglePalette]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // The palette combo always works, even mid-typing.
      if (registry.paletteCombo(e)) {
        e.preventDefault();
        togglePalette();
        return;
      }
      if (!(e.ctrlKey && e.shiftKey)) return;

      // While typing in an editable element, only combos that can't collide
      // with native text-editing (see ShortcutDef.allowInEditable) may run —
      // e.g. Ctrl+Shift+←/→ must keep meaning "select word" in an input.
      const inEditable = registry.isEditableTarget(e);

      for (const def of registry.shortcuts) {
        if (def.id === "open-palette") continue; // handled above
        if (inEditable && !def.allowInEditable) continue;
        if (def.match(e)) {
          e.preventDefault();
          def.run(e);
          return;
        }
      }
    };

    // Non-keyboard entry point: the avatar-dropdown "Shortcuts" item.
    const onOpenRequest = () => setPaletteOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(PALETTE_OPEN_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(PALETTE_OPEN_EVENT, onOpenRequest);
    };
  }, [registry, togglePalette]);

  return (
    <CommandPalette
      open={paletteOpen}
      onOpenChange={setPaletteOpen}
      shortcuts={registry.shortcuts}
    />
  );
}
