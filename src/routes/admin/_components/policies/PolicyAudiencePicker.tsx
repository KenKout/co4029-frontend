import { useEffect, useMemo, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useListRoles } from "@/lib/api/hooks/admin";
import { useSetPolicyAudience, type PolicyDetail } from "@/lib/api/hooks/policies";

/**
 * Which roles a policy names as a party.
 *
 * This is not access control — the policy endpoints are unauthenticated and the
 * server treats role codes from a reader as a filter, nothing more. What it
 * controls is relevance: a student should not have to read the organization
 * manager's obligations to find their own.
 *
 * The empty set is a real, meaningful choice rather than an unfinished one,
 * so it is stated on screen ("everyone, including signed-out visitors") instead
 * of being left to look like a form the admin forgot to fill in.
 *
 * The section has NO save button of its own: it reports its dirty state up and
 * registers its save function, which the workspace's shared sticky bar
 * (DraftActionsBar) invokes alongside the draft-text save.
 */
export function PolicyAudiencePicker({
  policy,
  onDirtyChange,
  registerSave,
}: {
  policy: PolicyDetail;
  /** Reports the audience's unsaved state so a shared action bar can react. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Registers `() => Promise<void>` — called by the shared action bar's Save. */
  registerSave?: (save: (() => Promise<void>) | null) => void;
}) {
  const { t } = useTranslation();
  const roles = useListRoles();
  const save = useSetPolicyAudience(policy.id);

  const serverCodes = useMemo(
    () => [...policy.audience.map((r) => r.code)].sort(),
    [policy.audience],
  );
  const [selected, setSelected] = useState<string[]>(serverCodes);

  // Re-sync when the server's answer changes under us — after a save, or when
  // another admin's edit arrives on a refetch.
  useEffect(() => setSelected(serverCodes), [serverCodes]);

  const dirty =
    selected.length !== serverCodes.length ||
    [...selected].sort().some((c, i) => c !== serverCodes[i]);

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  async function handleSave() {
    try {
      await save.mutateAsync(selected);
      toast.success(t("admin.policies.toasts.audience_saved"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.policies.toasts.audience_failed"),
      );
    }
  }

  // Register the latest save; unregister (null) on unmount.
  const saveRef = useRef(handleSave);
  saveRef.current = handleSave;
  useEffect(() => {
    registerSave?.(() => saveRef.current());
    return () => registerSave?.(null);
  }, [registerSave]);

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  return (
    <section className="rounded-xl border border-m3-outline-variant/20 bg-white p-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("admin.policies.audience_title")}
      </h2>
      <p className="mt-1 text-xs text-text-muted">
        {t("admin.policies.audience_hint")}
      </p>

      {roles.isPending ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {(roles.data ?? []).map(({ role }) => {
            const on = selected.includes(role.code);
            return (
              <Button
                key={role.id}
                type="button"
                variant="ghost"
                aria-pressed={on}
                onClick={() => toggle(role.code)}
                className={cn(
                  "h-auto rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  on
                    ? "border-m3-primary bg-m3-primary text-white hover:bg-m3-primary hover:text-white"
                    : "border-m3-outline-variant/40 text-m3-on-surface-variant hover:bg-m3-surface-container-high",
                )}
              >
                {role.name}
              </Button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        {selected.length === 0 ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-m3-on-surface-variant">
            <Globe className="h-3.5 w-3.5" />
            {t("admin.policies.public_audience")}
          </span>
        ) : null}
      </div>
    </section>
  );
}
