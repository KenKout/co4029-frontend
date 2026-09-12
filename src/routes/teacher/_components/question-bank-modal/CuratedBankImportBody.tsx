import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { Input } from "@/components/ui/input";
import {
  useCuratedQuizQuestionBank,
  useImportCuratedQuizQuestions,
} from "@/lib/api/hooks/quizzes";
import { cn } from "@/lib/utils";
import type { QuestionBankModalProps } from "./types";

export function CuratedBankImportBody({
  courseId,
  quizId,
  onClose,
}: QuestionBankModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bank = useCuratedQuizQuestionBank(courseId, {
    status: "approved",
    search: search.trim(),
  });
  const importer = useImportCuratedQuizQuestions(quizId);

  function toggle(itemId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function importSelected() {
    if (selected.size === 0) return;
    try {
      const created = await importer.mutateAsync(Array.from(selected));
      // Pluralised by i18next rather than an inline "s": Vietnamese has no
      // plural suffix, so the hand-built English form was untranslatable.
      toast.success(
        t("teacher_question_bank.quiz.import_done", { count: created.length }),
      );
      onClose();
    } catch (error) {
      toast.error(
        (error as Error).message ||
          t("teacher_question_bank.quiz.import_failed"),
      );
    }
  }

  return (
    <>
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-m3-on-surface-variant" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t(
            "teacher_question_bank.quiz.import_search_placeholder",
          )}
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="min-h-52 flex-1 overflow-y-auto rounded-xl border border-m3-outline-variant/20">
        {bank.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-m3-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />{" "}
            {t("teacher_question_bank.quiz.import_loading")}
          </div>
        ) : bank.items.length === 0 ? (
          <div className="p-8 text-center text-sm text-m3-on-surface-variant">
            {t("teacher_question_bank.quiz.import_empty")}
          </div>
        ) : (
          <InfiniteList
            items={bank.items}
            keyOf={(item) => item.id}
            hasNextPage={bank.hasNextPage}
            fetchNextPage={bank.fetchNextPage}
            isFetchingNextPage={bank.isFetchingNextPage}
            isLoading={bank.isLoading}
            className="divide-y divide-m3-outline-variant/20"
            renderItem={(item) => (
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-m3-surface-container-low",
                  selected.has(item.id) && "bg-m3-secondary-fixed/20",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  onClick={(event) => event.stopPropagation()}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="block text-sm text-m3-on-surface">
                    {item.prompt_text}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">
                      {t(
                        `teacher_question_bank.quiz.type_${item.question_type}`,
                      )}
                    </Badge>
                    {item.difficulty ? (
                      <Badge variant="outline">
                        {t(
                          `teacher_question_bank.quiz.difficulty_${item.difficulty}`,
                        )}
                      </Badge>
                    ) : null}
                    {/* Bloom levels are rendered raw across the whole app —
                        no locale copy exists for them anywhere. */}
                    {item.bloom_level ? (
                      <Badge variant="outline" className="capitalize">
                        {item.bloom_level}
                      </Badge>
                    ) : null}
                  </span>
                </span>
              </button>
            )}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 shrink-0">
        <span className="text-xs text-m3-on-surface-variant">
          {t("teacher_question_bank.quiz.import_selected_count", {
            count: selected.size,
          })}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {t("teacher_question_bank.quiz.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void importSelected()}
            disabled={selected.size === 0 || importer.isPending}
          >
            {importer.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {selected.size
              ? t("teacher_question_bank.quiz.import_action_count", {
                  count: selected.size,
                })
              : t("teacher_question_bank.quiz.import_action")}
          </Button>
        </div>
      </div>
    </>
  );
}
