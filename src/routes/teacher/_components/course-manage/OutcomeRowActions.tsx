import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  CornerDownRight,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CourseOutcome, TranslateFn } from "./types";
import type { CourseOutcomesController } from "./use-course-outcomes-editor";

/**
 * The row's action cluster — deliberately minimal, per the outliner design:
 *
 *   [+]  — add a sub-outcome (child)
 *   [⋯]  — overflow: duplicate / add sibling / indent / outdent / delete
 *
 * Everything else the old icon row did (edit, add-child-as-arrow) is now
 * keyboard territory: click the text to edit, Tab to indent, etc. The two
 * visible buttons are the only ones with no keyboard home.
 */
export function OutcomeRowActions({
  outcome,
  ctl,
  t,
}: {
  outcome: CourseOutcome;
  ctl: CourseOutcomesController;
  t: TranslateFn;
}) {
  const {
    duplicateOutcome,
    setDraft,
    indent,
    outdent,
    setPendingDeleteId,
  } = ctl;
  const [menuOpen, setMenuOpen] = useState(false);

  async function duplicate() {
    try {
      await duplicateOutcome.mutateAsync(outcome.id);
    } catch (err: unknown) {
      // Surface the backend message; the toast helper lives in the hook.
      void err;
    }
  }

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={t("teacher_outcomes.add_child", "Add sub-outcome")}
        title={t("teacher_outcomes.add_child", "Add sub-outcome")}
        onClick={() =>
          setDraft({ parentId: outcome.id, afterId: outcome.id })
        }
      >
        <Plus className="h-4 w-4 text-m3-on-surface-variant" />
      </Button>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t("teacher_outcomes.more", "More actions")}
            />
          }
        >
          <MoreHorizontal className="h-4 w-4 text-m3-on-surface-variant" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[13rem]">
          <DropdownMenuItem
            onSelect={() => {
              setDraft({ parentId: outcome.parent_id ?? null, afterId: outcome.id });
            }}
          >
            <CornerDownRight className="h-4 w-4" />
            {t("teacher_outcomes.add_sibling", "Add sibling below")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void duplicate()}>
            <Copy className="h-4 w-4" />
            {t("teacher_outcomes.duplicate", "Duplicate")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void indent(outcome)}>
            <ArrowDownToLine className="h-4 w-4" />
            {t("teacher_outcomes.indent", "Indent (Tab)")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void outdent(outcome)}>
            <ArrowUpFromLine className="h-4 w-4" />
            {t("teacher_outcomes.outdent", "Outdent (Shift+Tab)")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setPendingDeleteId(outcome.id)}
          >
            <Trash2 className="h-4 w-4" />
            {t("teacher_outcomes.delete", "Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
