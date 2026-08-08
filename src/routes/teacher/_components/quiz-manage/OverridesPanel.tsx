import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateOverride,
  useDeleteOverride,
  useQuizOverrides,
  type QuizOverrideIn,
} from "@/lib/api/hooks/quizzes";

/**
 * Phase 5 — per-user override management. A teacher grants one student an
 * exception (extra attempts, extended time limit, shifted window) without
 * changing the base quiz. Group overrides exist in the schema but resolve only
 * once a group-membership source lands, so the UI focuses on user overrides.
 */
export function OverridesPanel({ quizId }: { quizId: string }) {
  const { t } = useTranslation();
  const { data: overrides, isLoading } = useQuizOverrides(quizId);
  const create = useCreateOverride(quizId);
  const del = useDeleteOverride(quizId);

  const [userId, setUserId] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");

  async function handleAdd() {
    if (!userId.trim()) {
      toast.error(t("teacher_quiz_manage.overrides.user_required"));
      return;
    }
    const body: QuizOverrideIn = {
      scope: "user",
      user_id: userId.trim(),
      max_attempts: maxAttempts.trim() ? Number(maxAttempts) : null,
      time_limit_seconds: timeLimitMinutes.trim()
        ? Math.round(Number(timeLimitMinutes) * 60)
        : null,
    };
    try {
      await create.mutateAsync(body);
      toast.success(t("teacher_quiz_manage.overrides.added"));
      setUserId("");
      setMaxAttempts("");
      setTimeLimitMinutes("");
    } catch {
      toast.error(t("teacher_quiz_manage.overrides.add_failed"));
    }
  }

  async function handleDelete(id: string) {
    try {
      await del.mutateAsync(id);
      toast.success(t("teacher_quiz_manage.overrides.deleted"));
    } catch {
      toast.error(t("teacher_quiz_manage.overrides.delete_failed"));
    }
  }

  return (
    <div className="space-y-4">
      {/* Add-override row */}
      <div className="grid gap-3 sm:grid-cols-4 items-end">
        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_quiz_manage.overrides.user_id_label")}
          </label>
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder={t("teacher_quiz_manage.overrides.user_id_placeholder")}
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_quiz_manage.overrides.max_attempts_label")}
          </label>
          <Input
            type="number"
            min={1}
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_quiz_manage.overrides.time_limit_label")}
          </label>
          <Input
            type="number"
            min={1}
            value={timeLimitMinutes}
            onChange={(e) => setTimeLimitMinutes(e.target.value)}
            className="w-full"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={create.isPending}
        onClick={() => void handleAdd()}
      >
        {create.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {t("teacher_quiz_manage.overrides.add_action")}
      </Button>

      {/* Existing overrides */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-m3-secondary" />
        </div>
      ) : !overrides || overrides.length === 0 ? (
        <p className="text-sm text-m3-on-surface-variant py-4 text-center">
          {t("teacher_quiz_manage.overrides.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {overrides.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-3 rounded-lg border border-m3-outline-variant/30 px-3 py-2 text-sm"
            >
              <UserCog className="h-4 w-4 text-m3-primary shrink-0" />
              <span
                className="font-mono text-xs truncate flex-1"
                title={o.user_id ?? ""}
              >
                {o.user_id}
              </span>
              {o.max_attempts != null && (
                <span className="text-xs text-m3-on-surface-variant">
                  {t("teacher_quiz_manage.overrides.attempts_badge", {
                    count: o.max_attempts,
                  })}
                </span>
              )}
              {o.time_limit_seconds != null && (
                <span className="text-xs text-m3-on-surface-variant">
                  {Math.round(o.time_limit_seconds / 60)}m
                </span>
              )}
              <Button variant="ghost"
                type="button"
                onClick={() => void handleDelete(o.id)}
                disabled={del.isPending}
                className="text-m3-error hover:opacity-70 shrink-0"
                aria-label={t("teacher_quiz_manage.overrides.delete_action")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
