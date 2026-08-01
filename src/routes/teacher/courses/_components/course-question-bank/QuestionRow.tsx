import type { CSSProperties } from "react";

import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { STAGGER_CAP, STAGGER_MS } from "./constants";
import { ItemEditor } from "./ItemEditor";
import { QuestionRowDisplay } from "./QuestionRowDisplay";
import type { QuestionRowControllers } from "./QuestionList";

/**
 * One bank row: the animated shell plus the edit-vs-read switch. Extracted
 * verbatim from the former 843-line course-question-bank.tsx.
 */
export function QuestionRow({
  item,
  index,
  controllers,
}: {
  item: InterviewQuestionBankItemRead;
  index: number;
  controllers: QuestionRowControllers;
}) {
  const { editor, deletion } = controllers;
  const isEditing = editor.editingId === item.id && editor.draft;
  const isDeleting = deletion.deletingIds.has(item.id);
  return (
    // The entrance animation lives on an INNER wrapper, never on
    // this <li>. `fade-in-up ... both` keeps its final
    // `transform: translateY(0)` applied forever, which silently wins
    // over `hover:-translate-y-0.5` and over the delete slide-out —
    // verified in a browser: the lift measured as a no-op until the
    // animation was moved off the element that owns the transforms.
    <li
      className={cn(
        "group origin-top overflow-hidden rounded-xl border bg-m3-surface-container-lowest",
        "transition-all duration-300 ease-in",
        isDeleting
          ? "max-h-0 -translate-x-4 scale-95 border-transparent opacity-0 !my-0 !p-0"
          : "max-h-[900px] border-m3-outline-variant/30",
        // Hover lift only when not editing — a form that drifts under
        // the cursor is worse than no affordance.
        !isEditing &&
          !isDeleting &&
          "hover:-translate-y-0.5 hover:border-m3-primary/40 hover:shadow-editorial",
      )}
    >
      <div
        className={
          isDeleting
            ? undefined
            : "animate-[fade-in-up_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
        }
        style={
          {
            animationDelay: `${Math.min(index, STAGGER_CAP) * STAGGER_MS}ms`,
          } as CSSProperties
        }
      >
        {isEditing ? (
          <ItemEditor
            draft={isEditing}
            setDraft={editor.setDraft}
            saving={editor.savingId === item.id}
            onCancel={editor.cancelEdit}
            onSave={() => void editor.saveEdit()}
          />
        ) : (
          <QuestionRowDisplay item={item} controllers={controllers} />
        )}
      </div>
    </li>
  );
}
