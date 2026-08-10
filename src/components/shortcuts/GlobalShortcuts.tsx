import { useCallback, useEffect, useMemo, useState } from "react";
import { buildRegistry } from "@/lib/shortcuts";
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
      // Everything else yields to text editing.
      if (registry.isEditableTarget(e)) return;
      if (!(e.ctrlKey && e.shiftKey)) return;

      for (const def of registry.shortcuts) {
        if (def.id === "open-palette") continue; // handled above
        if (def.match(e)) {
          e.preventDefault();
          def.run(e);
          return;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [registry, togglePalette]);

  return (
    <CommandPalette
      open={paletteOpen}
      onOpenChange={setPaletteOpen}
      shortcuts={registry.shortcuts}
    />
  );
}
