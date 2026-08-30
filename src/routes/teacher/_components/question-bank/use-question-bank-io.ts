import { useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  InterviewQuestionAuthoring,
  InterviewQuestionBankItemCreate,
  InterviewQuestionBankItemRead,
  InterviewQuestionBankLogicalGroupCreate,
} from "@/lib/api/types";
import type {
  AddToBankMutation,
  TranslateFn,
} from "./types";

/**
 * Question bank: add-to-bank + import-from-bank (copy semantics). Extracted
 * from the former 2.4k-line question-bank.tsx.
 */
export interface QuestionBankIoOptions {
  configId: string;
  sorted: InterviewQuestionAuthoring[];
  bankItems: InterviewQuestionBankItemRead[] | undefined;
  addToBank: AddToBankMutation;
  addLogicalGroupToBank: {
    mutateAsync: (payload: InterviewQuestionBankLogicalGroupCreate) => Promise<unknown>;
  };
  importFromBank: { mutateAsync: (itemIds: string[]) => Promise<{ created: unknown[] }> };
  announce: (msg: string) => void;
  t: TranslateFn;
}

/** The 4-item logical-group payload, one item per angle in canonical order. */
function buildLogicalGroupItems(
  questions: InterviewQuestionAuthoring[],
  configId: string,
): [
  InterviewQuestionBankItemCreate,
  InterviewQuestionBankItemCreate,
  InterviewQuestionBankItemCreate,
  InterviewQuestionBankItemCreate,
] {
  const byAngle = new Map(
    questions.map((question) => [question.question_type, question]),
  );
  const toBankItem = (question: InterviewQuestionAuthoring) => ({
    prompt_text: question.prompt_text,
    question_type: question.question_type as
      | "technical"
      | "system_design"
      | "situational"
      | "behavioral",
    difficulty: question.difficulty ?? null,
    model_answer: question.model_answer ?? null,
    source_config_id: configId,
  });
  return [
    toBankItem(byAngle.get("technical")!),
    toBankItem(byAngle.get("system_design")!),
    toBankItem(byAngle.get("situational")!),
    toBankItem(byAngle.get("behavioral")!),
  ];
}

export function useQuestionBankIo(options: QuestionBankIoOptions) {
  const {
    configId,
    sorted,
    bankItems,
    addToBank,
    addLogicalGroupToBank,
    importFromBank,
    announce,
    t,
  } = options;

  const [bankingId, setBankingId] = useState<string | null>(null);
  const [bankingGroupId, setBankingGroupId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Set<string>>(new Set());
  const [importBusy, setImportBusy] = useState(false);

  async function handleAddToBank(q: InterviewQuestionAuthoring) {
    setBankingId(q.id);
    try {
      await addToBank.mutateAsync({
        prompt_text: q.prompt_text,
        question_type: q.question_type,
        difficulty: q.difficulty ?? null,
        model_answer: q.model_answer ?? null,
        source_config_id: configId,
      });
      announce(t("teacher_interview_config.qbank.bank_added"));
      toast.success(t("teacher_interview_config.qbank.bank_added"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setBankingId(null);
    }
  }

  async function handleAddLogicalGroupToBank(
    questions: InterviewQuestionAuthoring[],
  ) {
    const groupId = questions[0]?.variant_group_id;
    const angles = new Set(questions.map((question) => question.question_type));
    const required = new Set([
      "technical",
      "system_design",
      "situational",
      "behavioral",
    ]);
    if (
      !groupId ||
      questions.length !== 4 ||
      angles.size !== 4 ||
      [...required].some((angle) =>
        !angles.has(angle as InterviewQuestionAuthoring["question_type"]),
      )
    ) {
      toast.error(t("teacher_interview_config.qbank.logical_group_incomplete"));
      return;
    }
    if (
      questions.some((question) =>
        bankedPrompts.has(question.prompt_text.trim().toLowerCase()),
      )
    ) {
      toast.error(t("teacher_interview_config.qbank.logical_group_already_banked"));
      return;
    }

    setBankingGroupId(groupId);
    try {
      await addLogicalGroupToBank.mutateAsync({
        items: buildLogicalGroupItems(questions, configId),
      });
      announce(t("teacher_interview_config.qbank.logical_group_added"));
      toast.success(t("teacher_interview_config.qbank.logical_group_added"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setBankingGroupId(null);
    }
  }

  // Items already present in THIS config (by normalized prompt) are hidden
  // from the import picker so a teacher can't obviously double-add.
  const existingPrompts = useMemo(
    () => new Set(sorted.map((q) => q.prompt_text.trim().toLowerCase())),
    [sorted],
  );
  const importableBankItems = useMemo(
    () =>
      (bankItems ?? []).filter(
        (b) => !existingPrompts.has(b.prompt_text.trim().toLowerCase()),
      ),
    [bankItems, existingPrompts],
  );

  // Prompts already present in the course bank (normalized). Drives the
  // per-question "Add to bank" disabled state + "Already in bank" label.
  const bankedPrompts = useMemo(
    () =>
      new Set((bankItems ?? []).map((b) => b.prompt_text.trim().toLowerCase())),
    [bankItems],
  );

  function toggleBankSelection(id: string) {
    setSelectedBank((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImportFromBank() {
    const itemIds = importableBankItems
      .filter((b) => selectedBank.has(b.id))
      .map((b) => b.id);
    if (itemIds.length === 0) return;
    setImportBusy(true);
    try {
      // The server expands every selected logical child to its active siblings,
      // assigns collision-safe positions and commits the whole import atomically.
      const result = await importFromBank.mutateAsync(itemIds);
      const created = result.created.length;
      announce(t("teacher_interview_config.qbank.imported", { count: created }));
      toast.success(t("teacher_interview_config.qbank.imported", { count: created }));
      setImporting(false);
      setSelectedBank(new Set());
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setImportBusy(false);
    }
  }

  function startImport() {
    setSelectedBank(new Set());
    setImporting(true);
  }

  return {
    bankingId,
    bankingGroupId,
    importing,
    setImporting,
    selectedBank,
    importBusy,
    importableBankItems,
    bankedPrompts,
    handleAddToBank,
    handleAddLogicalGroupToBank: (questions: InterviewQuestionAuthoring[]) =>
      void handleAddLogicalGroupToBank(questions),
    toggleBankSelection,
    handleImportFromBank,
    startImport,
  };
}
