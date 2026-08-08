import { ChevronDown } from "lucide-react";

import { RichContent } from "@/components/ui/rich-content";
import {
  FAQ_CATEGORY_LABELS,
  FAQ_CATEGORY_ORDER,
  FAQ_ENTRIES,
  type FaqCategory,
} from "@/lib/help-content";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FaqAccordionProps {
  grouped: Map<FaqCategory, typeof FAQ_ENTRIES>;
  openIds: Set<string>;
  isSearching: boolean;
  toggle: (id: string) => void;
}

function FaqEntryRow({
  entry,
  open,
  toggle,
}: {
  entry: (typeof FAQ_ENTRIES)[number];
  open: boolean;
  toggle: (id: string) => void;
}) {
  return (
    <div id={`q-${entry.id}`}>
      <Button variant="ghost"
        type="button"
        onClick={() => toggle(entry.id)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-m3-surface-container-low"
      >
        <span className="text-sm font-medium text-m3-on-surface">
          {entry.question}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-m3-on-surface-variant transition-transform",
            open && "rotate-180",
          )}
        />
      </Button>
      {open && (
        <div className="px-5 pb-5">
          <RichContent value={entry.answer} format="markdown" />
        </div>
      )}
    </div>
  );
}

export default function FaqAccordion({
  grouped,
  openIds,
  isSearching,
  toggle,
}: FaqAccordionProps) {
  return (
    <div className="space-y-8">
      {FAQ_CATEGORY_ORDER.filter((c) => grouped.has(c)).map((category) => (
        <section key={category}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {FAQ_CATEGORY_LABELS[category]}
          </h2>
          <div className="divide-y divide-m3-outline-variant/20 overflow-hidden rounded-xl border border-m3-outline-variant/30 bg-card">
            {(grouped.get(category) ?? []).map((entry) => (
              <FaqEntryRow
                key={entry.id}
                entry={entry}
                open={isSearching || openIds.has(entry.id)}
                toggle={toggle}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
