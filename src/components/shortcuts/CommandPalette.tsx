import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Command, SlidersHorizontal, LayoutGrid, ChevronRight } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type ShortcutCategory,
  type ShortcutDef,
} from "@/lib/shortcuts";

const CATEGORY_META: Record<ShortcutCategory, { labelKey: string; icon: React.ReactNode }> = {
  general: { labelKey: "shortcuts.category_general", icon: <Command className="h-3.5 w-3.5" /> },
  search: { labelKey: "shortcuts.category_search", icon: <Search className="h-3.5 w-3.5" /> },
  filters: { labelKey: "shortcuts.category_filters", icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
  tabs: { labelKey: "shortcuts.category_tabs", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  pagination: { labelKey: "shortcuts.category_pagination", icon: <ChevronRight className="h-3.5 w-3.5" /> },
};

function Kbd({ combo }: { combo: string }) {
  if (!combo) return null;
  return (
    <kbd className="inline-flex items-center gap-0.5 rounded-md border border-m3-outline-variant/50 bg-m3-surface px-1.5 py-0.5 text-[11px] font-medium text-m3-on-surface-variant tabular-nums">
      {combo}
    </kbd>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
  shortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: ShortcutDef[];
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  // Reset the filter each time the palette opens.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) setQuery("");
    wasOpen.current = open;
  }, [open]);

  const run = useCallback(
    (def: ShortcutDef) => {
      onOpenChange(false);
      // Synthetic event: these actions only read modifier keys / key when a
      // combo is present; the palette click carries none, which is fine.
      const ev = new KeyboardEvent("keydown", { key: "", bubbles: true });
      def.run(ev);
    },
    [onOpenChange],
  );

  const q = query.trim().toLowerCase();
  const grouped = (Object.keys(CATEGORY_META) as ShortcutCategory[])
    .map((cat) => ({
      cat,
      defs: shortcuts.filter(
        (s) => s.category === cat && (q === "" || t(s.labelKey).toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.defs.length > 0);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-[20vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2",
            "rounded-xl border border-m3-outline-variant/40 bg-white shadow-2xl outline-none",
            "transition-all duration-150",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {t("shortcuts.palette_title")}
          </DialogPrimitive.Title>

          <div className="flex items-center gap-2 border-b border-m3-outline-variant/30 px-4">
            <Search className="h-4 w-4 shrink-0 text-m3-on-surface-variant" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onOpenChange(false);
              }}
              placeholder={t("shortcuts.palette_placeholder")}
              className="h-12 w-full bg-transparent text-sm text-m3-on-surface outline-none placeholder:text-m3-on-surface-variant"
            />
            <Kbd combo="Esc" />
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-2">
            {grouped.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-m3-on-surface-variant">
                {t("shortcuts.no_results")}
              </p>
            ) : (
              grouped.map(({ cat, defs }) => (
                <div key={cat} className="mb-2 last:mb-0">
                  <p className="flex items-center gap-1.5 px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-m3-on-surface-variant">
                    {CATEGORY_META[cat].icon}
                    {t(CATEGORY_META[cat].labelKey)}
                  </p>
                  {defs.map((def) => (
                    <Button
                      key={def.id}
                      type="button"
                      variant="ghost"
                      onClick={() => run(def)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-m3-on-surface transition-colors cursor-pointer hover:bg-m3-primary-fixed focus:bg-m3-primary-fixed focus:outline-none"
                    >
                      <span className="truncate">{t(def.labelKey)}</span>
                      <Kbd combo={def.combo} />
                    </Button>
                  ))}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
