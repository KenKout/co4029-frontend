import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/use-confirm";
import { useTeacherCourseRoster } from "@/lib/api/hooks/teacher-courses";
import { useCreateOverride, useDeleteOverride, useQuizOverrides, type QuizOverrideIn } from "@/lib/api/hooks/quizzes";
import { Field } from "./form-primitives";
import type { SettingsDraft } from "./types";

/** Separate, immediately persisted exceptions. Base values are SAVED settings. */
function useOverrideEditor({ quizId, courseId, base, locked = false, onDirtyChange, onBusyChange }: {
  quizId: string; courseId: string; base: SettingsDraft; locked?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useTranslation();
  const k = "teacher_quiz_manage.settings.assist";
  const roster = useTeacherCourseRoster(courseId);
  const query = useQuizOverrides(quizId);
  const create = useCreateOverride(quizId);
  const del = useDeleteOverride(quizId);
  const { confirm, dialog } = useConfirm();
  const [userIds, setUserIds] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const actionInFlight = useRef(false);
  const [result, setResult] = useState<{ succeeded: number; failed: number } | null>(null);
  const [maxAttempts, setMaxAttempts] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [retakes, setRetakes] = useState("inherit");
  const busy = working || create.isPending || del.isPending;
  const dirty = Boolean(userIds.length || maxAttempts || timeLimitMinutes || retakes !== "inherit");
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  useEffect(() => { onDirtyChange?.(dirty || busy); }, [dirty, busy, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const students = roster.data?.students ?? [];
  const overrides = query.data ?? [];
  const name = (id?: string | null) => {
    const student = students.find((s) => s.student_id === id);
    return student ? `${student.display_name} · ${student.primary_email}` : t(`${k}.student_unavailable`);
  };
  const options = students.filter((s) => ["active", "completed"].includes(s.enrollment_status))
    .map((s) => ({ value: s.student_id, label: `${s.display_name} · ${s.primary_email}`, disabled: overrides.some((o) => o.user_id === s.student_id) }));
  const eligibleIds = userIds.filter((id) => options.some((o) => o.value === id && !o.disabled));
  const attempts = (allow: boolean, limit: string) => !allow ? "1" : limit || t(`${k}.unlimited`);
  const minutes = (value: string) => value ? t(`${k}.minutes`, { count: Number(value) }) : t(`${k}.unlimited`);
  const effectiveRetakes = retakes === "inherit" ? base.allow_retakes : retakes === "allow";
  const effectiveSummary = t(`${k}.override_effective`, {
    baseAttempts: attempts(base.allow_retakes, base.max_attempts),
    attempts: attempts(effectiveRetakes, maxAttempts || base.max_attempts),
    baseTime: minutes(base.time_limit_minutes), time: minutes(timeLimitMinutes || base.time_limit_minutes),
  });
  function reset() { setUserIds([]); setMaxAttempts(""); setTimeLimitMinutes(""); setRetakes("inherit"); }
  async function handleAdd() {
    if (locked || actionInFlight.current || eligibleIds.length === 0) return;
    const validInteger = (value: string) => !value || (Number.isInteger(Number(value)) && Number(value) >= 1);
    if (!validInteger(maxAttempts) || !validInteger(timeLimitMinutes) || (!maxAttempts && !timeLimitMinutes && retakes === "inherit")) return;
    const body: QuizOverrideIn = { scope: "user",
      max_attempts: maxAttempts ? Number(maxAttempts) : null,
      time_limit_seconds: timeLimitMinutes ? Number(timeLimitMinutes) * 60 : null,
      allow_retakes: retakes === "inherit" ? null : retakes === "allow",
    };
    actionInFlight.current = true;
    try {
      if (!(await confirm({ title: t("teacher_quiz_manage.overrides.add_action"), description: <><span className="block">{effectiveSummary}</span><span className="mt-2 block max-h-40 overflow-y-auto">{eligibleIds.map(name).join("; ")}</span></>, confirmLabel: t("teacher_quiz_manage.overrides.add_action"), cancelLabel: t("common.cancel"), confirmVariant: "default" }))) return;
      setWorking(true);
      setResult(null);
      const failed: string[] = [];
      for (const userId of eligibleIds) {
        try { await create.mutateAsync({ ...body, user_id: userId }); }
        catch { failed.push(userId); }
      }
      // A request can commit even if its response was lost. Reconcile before
      // offering retry, so successful students are never submitted again.
      const refreshed = failed.length ? await query.refetch() : null;
      const remaining = failed.filter((id) => !refreshed?.data?.some((o) => o.user_id === id));
      setResult({ succeeded: eligibleIds.length - remaining.length, failed: remaining.length });
      if (remaining.length) {
        setUserIds(remaining);
        toast.error(t(`${k}.batch_partial`, { succeeded: eligibleIds.length - remaining.length, failed: remaining.length }));
      } else {
        reset();
        toast.success(t("teacher_quiz_manage.overrides.added"));
      }
    } finally { actionInFlight.current = false; setWorking(false); }
  }
  async function handleDelete(id: string, user?: string | null) {
    if (locked || actionInFlight.current) return;
    actionInFlight.current = true;
    try {
      if (!(await confirm({ title: t("teacher_quiz_manage.overrides.delete_action"), description: t(`${k}.delete_override_confirm`, { student: name(user) }), confirmLabel: t("common.delete"), cancelLabel: t("common.cancel") }))) return;
      setWorking(true);
      await del.mutateAsync(id);
      setResult(null);
      toast.success(t("teacher_quiz_manage.overrides.deleted"));
    }
    catch { toast.error(t("teacher_quiz_manage.overrides.delete_failed")); }
    finally { actionInFlight.current = false; setWorking(false); }
  }
  return {
    t, k, query, roster, locked, busy, dirty, dialog, confirm, reset, handleAdd, handleDelete,
    userIds, setUserIds, maxAttempts, setMaxAttempts, result,
    timeLimitMinutes, setTimeLimitMinutes, retakes, setRetakes, eligibleIds, options,
    effectiveSummary, effectiveRetakes, overrides, base, name, attempts, minutes,
  };
}

type OverrideEditor = ReturnType<typeof useOverrideEditor>;

export function OverridesPanel(props: Parameters<typeof useOverrideEditor>[0]) {
  const model = useOverrideEditor(props);
  const { t, k, query, roster, dialog } = model;
  if (query.isLoading || roster.isLoading) return <Skeleton className="h-32 w-full" />;
  if ((query.isError && !query.data) || (roster.isError && !roster.data)) return <div role="alert" className="space-y-2"><p>{t(`${k}.load_failed`)}</p><Button type="button" variant="outline" onClick={() => { void query.refetch(); void roster.refetch(); }}>{t(`${k}.retry`)}</Button></div>;

  return <div className="space-y-4">
    <OverrideForm model={model} />
    {model.result && <p role="status" className="text-sm text-m3-primary">{t(`${k}.${model.result.failed ? "batch_partial" : "batch_saved"}`, model.result)}</p>}
    <OverrideList model={model} />
    {dialog}
  </div>;
}

function OverrideForm({ model }: { model: OverrideEditor }) {
  const { t, k, handleAdd, locked, busy, userIds, setUserIds, options,
    maxAttempts, setMaxAttempts, timeLimitMinutes, setTimeLimitMinutes,
    retakes, setRetakes, effectiveSummary, effectiveRetakes, eligibleIds, dirty, confirm, reset } = model;
  return (<form onSubmit={(event) => { event.preventDefault(); void handleAdd(); }}>
      <fieldset disabled={locked || busy} className="border-0 p-0 min-w-0 space-y-4">
        <Field label={t(`${k}.student`)} hint={t(`${k}.course_students_only`)}>
          <SearchableMultiSelect label={t(`${k}.student`)} value={userIds} onValueChange={setUserIds} options={options}
            placeholder={t(`${k}.search_students`)} emptyText={t(`${k}.no_students`)}
            removeLabel={(label) => t(`${k}.remove_student`, { student: label })} disabled={locked || busy} />
          {options.length === 0 && <p className="text-xs text-m3-on-surface-variant">{t(`${k}.no_students`)}</p>}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("teacher_quiz_manage.overrides.max_attempts_label")}>
            <Input type="number" min={1} step={1} aria-label={t("teacher_quiz_manage.overrides.max_attempts_label")} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder={t(`${k}.inherit`)} />
          </Field>
          <Field label={t("teacher_quiz_manage.overrides.time_limit_label")}>
            <Input type="number" min={1} step={1} aria-label={t("teacher_quiz_manage.overrides.time_limit_label")} value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(e.target.value)} placeholder={t(`${k}.inherit`)} endAdornment={t(`${k}.minute_unit`)} />
          </Field>
        </div>
        <Field label={t("teacher_quiz_manage.settings.attempts.allow_label")}>
          <Select aria-label={t("teacher_quiz_manage.settings.attempts.allow_label")} value={retakes} onValueChange={setRetakes} disabled={locked || busy}
            options={[{ value: "inherit", label: t(`${k}.inherit`) }, { value: "allow", label: t(`${k}.allow_retakes`) }, { value: "block", label: t(`${k}.block_retakes`) }]} />
        </Field>
        <p className="text-xs text-m3-on-surface-variant">{t(`${k}.override_inherit`)}</p>
        <p role="status" className="text-sm">{effectiveSummary}</p>
        {maxAttempts && Number(maxAttempts) > 1 && !effectiveRetakes && <p role="status" className="text-sm text-m3-error">{t(`${k}.retakes_disabled`)}</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="outline" disabled={busy || eligibleIds.length === 0 || (!maxAttempts && !timeLimitMinutes && retakes === "inherit")}>
            {t("teacher_quiz_manage.overrides.add_action")}
          </Button>
          {dirty && <Button type="button" variant="ghost" onClick={() => {
            void confirm({ title: t("common.unsaved.title"), description: t("common.unsaved.description"), confirmLabel: t("teacher_quiz_manage.settings.reset_button"), cancelLabel: t("common.cancel") }).then((ok) => { if (ok) reset(); });
          }}>{t("teacher_quiz_manage.settings.reset_button")}</Button>}
        </div>
      </fieldset>
    </form>);
}

function OverrideList({ model }: { model: OverrideEditor }) {
  const { t, k, overrides, base, name, attempts, minutes, locked, busy, handleDelete } = model;
  return (<>{overrides.length === 0 ? <p className="text-sm text-m3-on-surface-variant">{t("teacher_quiz_manage.overrides.empty")}</p> : <ul className="space-y-2">
      {overrides.map((o) => <li key={o.id} className="flex items-center gap-3 rounded-xl border border-m3-outline-variant/30 p-3 text-sm">
        <div className="min-w-0 flex-1 space-y-1"><p className="break-words font-semibold">{o.scope === "user" ? name(o.user_id) : t(`${k}.group_override`)}</p>
          <p className="text-xs text-m3-on-surface-variant">{t(`${k}.override_effective`, {
            baseAttempts: attempts(base.allow_retakes, base.max_attempts), attempts: attempts(o.allow_retakes ?? base.allow_retakes, o.max_attempts == null ? base.max_attempts : String(o.max_attempts)),
            baseTime: minutes(base.time_limit_minutes), time: minutes(o.time_limit_seconds == null ? base.time_limit_minutes : String(o.time_limit_seconds / 60)),
          })}</p>
        </div>
        <Button type="button" variant="ghost" disabled={locked || busy} onClick={() => void handleDelete(o.id, o.user_id)} aria-label={t("teacher_quiz_manage.overrides.delete_action")}><Trash2 className="h-4 w-4 text-m3-error" /></Button>
      </li>)}
    </ul>}</>);
}
