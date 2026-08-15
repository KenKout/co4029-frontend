import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { useAssignableTeachers, useAssignTeacher } from "@/lib/api/hooks/dept";
import { ApiError } from "@/lib/api/client";

/**
 * Pick a teacher to staff onto this course.
 *
 * This used to be a free-text box you pasted a user UUID into, which meant a
 * manager needed the id from somewhere else entirely. The options come from
 * `GET /dept/courses/{id}/assignable-teachers`, which resolves the
 * organization from the COURSE — the client sends no org parameter, so the
 * "same organization" rule cannot be bypassed by a crafted request. The POST
 * re-checks membership server-side for the same reason.
 *
 * Teachers already on the course are shown as such and cannot be re-picked,
 * since assigning them again is a no-op.
 */
export function AssignTeacherForm({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const [userId, setUserId] = useState("");
  const assign = useAssignTeacher(courseId);
  const { data: candidates, isLoading } = useAssignableTeachers(courseId);

  // Teachers already on the course are filtered OUT rather than rendered
  // disabled: the combobox has no per-option disabled support, so a disabled
  // flag on an option would be silently dropped and the manager could pick a
  // no-op. They are already visible in the teachers list right below this
  // form.
  const available = (candidates ?? []).filter((c) => !c.already_assigned);
  const assignedCount = (candidates ?? []).length - available.length;

  const options = available.map((teacher) => ({
    value: teacher.user_id,
    label: teacher.display_name
      ? `${teacher.display_name} · ${teacher.primary_email}`
      : teacher.primary_email,
  }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) return;
    assign.mutate(
      { user_id: userId },
      {
        onSuccess: () => {
          toast.success(t("dept_course_detail.success.assigned"));
          setUserId("");
        },
        onError: (err) => {
          const detail =
            err instanceof ApiError ? err.body || err.message : String(err);
          toast.error(t("dept_course_detail.errors.assign_failed", { detail }));
        },
      },
    );
  };

  const noCandidates = !isLoading && available.length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-elev border border-border rounded-lg p-4 mb-4"
    >
      <label className="block text-xs font-semibold text-text-muted mb-2">
        {t("dept_course_detail.assign_label")}
      </label>
      <div className="flex gap-2">
        <TeacherSearchCombobox
          options={options}
          value={userId}
          onValueChange={setUserId}
          disabled={assign.isPending || isLoading || noCandidates}
          placeholder={t("dept_course_detail.assign_placeholder")}
          emptyLabel={t("dept_course_detail.assign_no_match")}
        />
        <Button type="submit" disabled={assign.isPending || !userId}>
          <UserPlus className="h-3.5 w-3.5" />
          {t("dept_course_detail.assign_button")}
        </Button>
      </div>
      <p className="text-[11px] text-text-muted mt-2">
        {noCandidates
          ? // Distinguish "everyone is already on it" from "this org has no
            // teachers" — they need different actions from the manager.
            assignedCount > 0
            ? t("dept_course_detail.assign_all_assigned")
            : t("dept_course_detail.assign_none_available")
          : t("dept_course_detail.assign_help")}
      </p>
    </form>
  );
}

/**
 * Searchable teacher picker over the ALREADY-fetched assignable list.
 *
 * A plain `<Select>` forced the manager to scan an unsorted dropdown; this
 * one filters by name/email as they type. The list is small (org teachers),
 * so filtering is client-side over the fetched candidates — no extra
 * endpoint needed. Selecting collapses to a chip; clicking the chip reopens
 * the search to change the pick.
 */
function TeacherSearchCombobox({
  options,
  value,
  onValueChange,
  disabled,
  placeholder,
  emptyLabel,
}: {
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (next: string) => void;
  disabled?: boolean;
  placeholder: string;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);

  // Escape closes the popover from anywhere (the input, the chip, or a
  // blurred state); click-outside is handled by the invisible backdrop
  // rendered under the list.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options;

  function openSearch() {
    setQuery("");
    setOpen(true);
  }

  function pick(next: string) {
    onValueChange(next);
    setQuery("");
    setOpen(false);
  }

  // A closed pick shows the selected teacher as a chip; opening it (or
  // nothing picked yet) shows the search input with the live-filtered list.
  if (selected && !open) {
    return (
      <Button
        variant="outline"
        type="button"
        onClick={openSearch}
        disabled={disabled}
        className="flex h-auto flex-1 min-w-0 items-center justify-start gap-2 px-3 py-2 text-sm cursor-pointer"
      >
        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="min-w-0 truncate">{selected.label}</span>
      </Button>
    );
  }

  return (
    <div className="relative flex-1 min-w-0">
      <SearchInput
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Click must reopen even when the input already holds focus after
        // an Escape close — focus() on a focused input fires no onFocus.
        onClick={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        wrapperClassName="flex-1 min-w-0"
      />
      {open && (
        <>
          {/* Invisible backdrop: a click anywhere outside the list closes it.
              z-9 keeps it under the z-10 list but above the page content. */}
          <div
            className="fixed inset-0 z-[9]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-white shadow-lg max-h-64 overflow-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-muted">{emptyLabel}</p>
            ) : (
              <ul role="listbox" aria-label={placeholder}>
                {filtered.map((opt) => (
                  <li key={opt.value}>
                    <Button
                      variant="ghost"
                      type="button"
                      role="option"
                      aria-selected={opt.value === value}
                      onClick={() => pick(opt.value)}
                      className="w-full justify-start rounded-none px-3 py-2 text-sm cursor-pointer"
                    >
                      {opt.label}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
