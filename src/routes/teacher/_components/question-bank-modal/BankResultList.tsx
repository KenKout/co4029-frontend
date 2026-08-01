import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { InfiniteList } from "@/components/ui/InfiniteList";
import type { QuestionBankEntry } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import type { QuestionBankModalController } from "./use-question-bank-modal";

function BankRow({
  entry,
  selected,
  onToggle,
}: {
  entry: QuestionBankEntry;
  selected: boolean;
  onToggle: () => void;
}) {
  const q = entry.question;
  return (
    <li
      className={cn(
        "flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-m3-surface-container-low",
        selected && "bg-m3-secondary-fixed/20",
      )}
      onClick={onToggle}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm text-m3-on-surface line-clamp-2">
          {q.prompt_text}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="border-0 bg-blue-50 text-blue-800 text-[10px] capitalize">
            {q.question_type.replace("_", " ")}
          </Badge>
          {q.bloom_level ? (
            <Badge className="border-0 bg-purple-50 text-purple-800 text-[10px] capitalize">
              {q.bloom_level}
            </Badge>
          ) : null}
          {q.difficulty ? (
            <Badge className="border-0 bg-amber-50 text-amber-800 text-[10px] capitalize">
              {q.difficulty}
            </Badge>
          ) : null}
          <span className="text-[10px] text-m3-on-surface-variant truncate">
            from <strong>{entry.module_title}</strong>
            {" · "}
            {entry.quiz_title}
          </span>
        </div>
      </div>
    </li>
  );
}

/**
 * Result list: loading / error / empty / paginated states. The target quiz's
 * own questions are excluded server-side via `exclude_quiz_id`.
 */
export function BankResultList({
  controller,
}: {
  controller: QuestionBankModalController;
}) {
  const {
    bank,
    rows,
    isLoading,
    error,
    selected,
    toggle,
    activeFilterCount,
    resetFilters,
  } = controller;
  return (
    <div className="flex-1 overflow-y-auto rounded-xl border border-m3-outline-variant/20">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-m3-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading bank…
        </div>
      ) : error ? (
        <div className="p-6 text-sm text-red-700 bg-red-50">
          Failed to load bank: {(error as Error).message}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-m3-on-surface-variant space-y-2">
          <p>No bank questions match these filters.</p>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-m3-secondary hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <InfiniteList
          items={rows}
          hasNextPage={bank.hasNextPage}
          fetchNextPage={bank.fetchNextPage}
          isFetchingNextPage={bank.isFetchingNextPage}
          isLoading={isLoading}
          keyOf={(entry) => entry.question.id}
          className="divide-y divide-m3-outline-variant/20"
          renderItem={(entry) => (
            <BankRow
              entry={entry}
              selected={selected.has(entry.question.id)}
              onToggle={() => toggle(entry.question.id)}
            />
          )}
        />
      )}
    </div>
  );
}
