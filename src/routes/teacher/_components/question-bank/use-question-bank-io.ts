import { useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  InterviewQuestionAuthoring,
  InterviewQuestionBankItemRead,
  InterviewQuestionBankLogicalGroupCreate,
} from "@/lib/api/types";
import type { AddToBankMutation, TranslateFn } from "./types";

export const LOGICAL_ANGLE_ORDER = [
  "technical",
  "system_design",
  "situational",
  "behavioral",
] as const;

type LogicalAngle = (typeof LOGICAL_ANGLE_ORDER)[number];

export type ImportPickerUnit =
  | { kind: "item"; key: string; items: [InterviewQuestionBankItemRead] }
  | { kind: "logical"; key: string; items: InterviewQuestionBankItemRead[] };

function angleRank(item: InterviewQuestionBankItemRead) {
  const rank = LOGICAL_ANGLE_ORDER.indexOf(item.question_type as LogicalAngle);
  return rank === -1 ? LOGICAL_ANGLE_ORDER.length : rank;
}

function isCompleteLogicalGroup(items: InterviewQuestionBankItemRead[]) {
  return (
    items.length === LOGICAL_ANGLE_ORDER.length &&
    new Set(items.map((item) => item.question_type)).size ===
      LOGICAL_ANGLE_ORDER.length &&
    LOGICAL_ANGLE_ORDER.every((angle) =>
      items.some((item) => item.question_type === angle),
    )
  );
}

/**
 * Import-picker units over the course bank. Logical groups stay atomic: a
 * complete 4-angle group is ONE unit; anything partial renders as plain
 * items. A unit whose ANY member prompt already exists in the destination
 * config is dropped entirely — the server import is all-or-nothing, so a
 * visible half-collision would fail the whole request.
 *
 * Exported and pure so the regression tests exercise the shipped rule.
 */
export function buildImportPickerUnits(
  bankItems: InterviewQuestionBankItemRead[] | undefined,
  existingPrompts: Set<string>,
): ImportPickerUnit[] {
  const groups = new Map<string, InterviewQuestionBankItemRead[]>();
  for (const item of bankItems ?? []) {
    const key = item.variant_group_id
      ? `group:${item.variant_group_id}`
      : `item:${item.id}`;
    const members = groups.get(key);
    if (members) members.push(item);
    else groups.set(key, [item]);
  }

  const units: ImportPickerUnit[] = [];
  for (const [key, members] of groups) {
    if (
      members.some((item) =>
        existingPrompts.has(item.prompt_text.trim().toLowerCase()),
      )
    ) {
      continue;
    }
    const ordered = [...members].sort(
      (a, b) => angleRank(a) - angleRank(b) || a.id.localeCompare(b.id),
    );
    if (members[0]?.variant_group_id && isCompleteLogicalGroup(ordered)) {
      units.push({ kind: "logical", key, items: ordered });
    } else {
      for (const item of ordered) {
        units.push({ kind: "item", key: `item:${item.id}`, items: [item] });
      }
    }
  }
  return units;
}

/** Question bank add/import controller. Logical bank groups stay atomic. */
export interface QuestionBankIoOptions {
  configId: string;
  sorted: InterviewQuestionAuthoring[];
  bankItems: InterviewQuestionBankItemRead[] | undefined;
  addToBank: AddToBankMutation;
  addLogicalGroupToBank: {
    mutateAsync: (payload: InterviewQuestionBankLogicalGroupCreate) => Promise<unknown>;
  };
  importFromBank: {
    mutateAsync: (itemIds: string[]) => Promise<{ created: unknown[] }>;
  };
  announce: (msg: string) => void;
  t: TranslateFn;
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
  // Stores physical bank-item ids. A logical picker unit toggles all its child ids.
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
    if (
      !groupId ||
      questions.length !== 4 ||
      angles.size !== 4 ||
      LOGICAL_ANGLE_ORDER.some((angle) => !angles.has(angle))
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
      const byAngle = new Map(questions.map((question) => [question.question_type, question]));
      const toBankItem = (question: InterviewQuestionAuthoring) => ({
        prompt_text: question.prompt_text,
        question_type: question.question_type as LogicalAngle,
        difficulty: question.difficulty ?? null,
        model_answer: question.model_answer ?? null,
        source_config_id: configId,
      });
      await addLogicalGroupToBank.mutateAsync({
        items: LOGICAL_ANGLE_ORDER.map((angle) =>
          toBankItem(byAngle.get(angle)!),
        ) as InterviewQuestionBankLogicalGroupCreate["items"],
      });
      announce(t("teacher_interview_config.qbank.logical_group_added"));
      toast.success(t("teacher_interview_config.qbank.logical_group_added"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setBankingGroupId(null);
    }
  }

  const existingPrompts = useMemo(
    () => new Set(sorted.map((question) => question.prompt_text.trim().toLowerCase())),
    [sorted],
  );

  // Any group member already in the config blocks the entire atomic group.
  const importPickerUnits = useMemo(
    () => buildImportPickerUnits(bankItems, existingPrompts),
    [bankItems, existingPrompts],
  );

  const importableBankItems = useMemo(
    () => importPickerUnits.flatMap((unit) => unit.items),
    [importPickerUnits],
  );

  const bankedPrompts = useMemo(
    () =>
      new Set((bankItems ?? []).map((item) => item.prompt_text.trim().toLowerCase())),
    [bankItems],
  );

  function toggleBankSelection(itemIds: string[]) {
    setSelectedBank((previous) => {
      const next = new Set(previous);
      const allSelected = itemIds.every((id) => next.has(id));
      for (const id of itemIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  async function handleImportFromBank() {
    // Keep unit order as displayed. Each logical unit sends canonical child IDs.
    const itemIds = importPickerUnits.flatMap((unit) =>
      unit.items
        .filter((item) => selectedBank.has(item.id))
        .map((item) => item.id),
    );
    if (itemIds.length === 0) return;
    setImportBusy(true);
    try {
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
    importPickerUnits,
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
