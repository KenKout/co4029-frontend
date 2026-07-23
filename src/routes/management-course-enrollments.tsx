import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Copy,
  FileSpreadsheet,
  Loader2,
  Plus,
  Trash2,
  Upload,
  UserMinus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import {
  useBulkEnroll,
  useCreateInvitationCode,
  useDeleteInvitationCode,
  useDeptEnrollments,
  useDropEnrollment,
  useImportEnrollmentsCsv,
  useListInvitationCodes,
  usePatchInvitationCode,
} from "@/lib/api/hooks/enrollments";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import type {
  BulkEnrollFailure,
  BulkEnrollResult,
  EnrollmentAuthoring,
  InvitationCodeAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

type TabKey = "roster" | "bulk" | "codes";

const TABS: { key: TabKey; labelKey: string; icon: typeof Users }[] = [
  {
    key: "roster",
    labelKey: "management_course_enrollments.tabs.roster",
    icon: Users,
  },
  {
    key: "bulk",
    labelKey: "management_course_enrollments.tabs.bulk",
    icon: Upload,
  },
  {
    key: "codes",
    labelKey: "management_course_enrollments.tabs.codes",
    icon: FileSpreadsheet,
  },
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FAILURE_KEY: Record<string, string> = {
  user_not_found: "management_course_enrollments.failure.user_not_found",
  already_enrolled: "management_course_enrollments.failure.already_enrolled",
  invalid_identifier:
    "management_course_enrollments.failure.invalid_identifier",
  forbidden: "management_course_enrollments.failure.forbidden",
};

function useFailureLabel() {
  const { t } = useTranslation();
  return (reason: string): string => {
    const key = FAILURE_KEY[reason];
    return key ? t(key) : reason;
  };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function ManagementCourseEnrollmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams({ strict: false }) as { courseId: string };

  const permissions = useMyPermissions();
  const canManage =
    permissions.data?.permissions.includes("course.enrollment.create") ??
    permissions.data?.permissions.includes("system.administer") ??
    false;

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canManage) {
      toast.error(t("management_course_enrollments.errors.no_access"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canManage, navigate, t]);

  const enabled = !permissions.isLoading && canManage;
  const { data: course } = useTeacherCourseById(enabled ? courseId : "");

  const [tab, setTab] = useState<TabKey>("roster");

  if (permissions.isLoading || !enabled) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-surface-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-16 space-y-6">
      <div className="pt-4">
        <Breadcrumbs
          items={[
            {
              label: t("teacher_common.breadcrumb_teaching"),
              to: "/teacher/courses",
            },
            {
              label: course?.title ?? t("teacher_common.breadcrumb_course"),
              to: "/teacher/courses/$courseId",
              params: { courseId },
            },
            { label: t("management_course_enrollments.breadcrumb.manage") },
          ]}
        />
      </div>

      <div className="flex items-center gap-3">
        <Link to="/teacher/courses/$courseId" params={{ courseId }}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-headline font-bold text-m3-on-surface truncate">
            {t("management_course_enrollments.header.title")}
          </h1>
          <p className="text-xs text-m3-on-surface-variant mt-0.5 truncate">
            {course?.title ?? "…"}
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-m3-outline-variant/30">
        {TABS.map((tabItem) => {
          const Icon = tabItem.icon;
          const active = tabItem.key === tab;
          return (
            <button
              key={tabItem.key}
              type="button"
              onClick={() => setTab(tabItem.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer",
                active
                  ? "border-m3-primary text-m3-primary"
                  : "border-transparent text-m3-on-surface-variant hover:text-m3-on-surface",
              )}
            >
              <Icon className="h-4 w-4" />
              {t(tabItem.labelKey)}
            </button>
          );
        })}
      </div>

      {tab === "roster" && <RosterTab courseId={courseId} />}
      {tab === "bulk" && <BulkTab courseId={courseId} />}
      {tab === "codes" && <CodesTab courseId={courseId} />}
    </div>
  );
}

/* ── Tab 1: Roster ─────────────────────────────────────────────────── */

function RosterTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useDeptEnrollments(courseId);
  const drop = useDropEnrollment(courseId);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const rows: EnrollmentAuthoring[] = data ?? [];

  function handleDrop(userId: string) {
    drop.mutate(userId, {
      onSuccess: () => {
        toast.success(t("management_course_enrollments.toasts.dropped"));
        setConfirmId(null);
      },
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("management_course_enrollments.toasts.drop_failed"),
        ),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 bg-m3-surface-container animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {t("management_course_enrollments.errors.roster_load_failed")}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-m3-on-surface-variant">
        <Users className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">
          {t("management_course_enrollments.roster.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1fr_140px_140px_120px_100px] gap-4 px-5 py-3 border-b border-m3-outline-variant/10 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
        <span>{t("management_course_enrollments.roster.col_student")}</span>
        <span>{t("management_course_enrollments.roster.col_status")}</span>
        <span>{t("management_course_enrollments.roster.col_source")}</span>
        <span>{t("management_course_enrollments.roster.col_enrolled_at")}</span>
        <span className="text-right">
          {t("management_course_enrollments.roster.col_actions")}
        </span>
      </div>
      <div className="divide-y divide-m3-outline-variant/10">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_120px_100px] gap-4 px-5 py-3 items-center"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-m3-on-surface truncate">
                {row.display_name || row.primary_email || row.student_id}
              </p>
              {row.display_name && row.primary_email && (
                <p className="text-xs text-m3-on-surface-variant truncate">
                  {row.primary_email}
                </p>
              )}
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md w-fit">
              {row.status}
            </span>
            <span className="text-xs text-m3-on-surface-variant">
              {row.source}
            </span>
            <span className="text-xs text-m3-on-surface-variant">
              {formatDate(row.enrolled_at)}
            </span>
            <div className="flex justify-end">
              {confirmId === row.student_id ? (
                <div className="flex gap-1">
                  <Button
                    size="xs"
                    variant="destructive"
                    onClick={() => handleDrop(row.student_id)}
                    disabled={drop.isPending}
                  >
                    {drop.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      t("common.confirm")
                    )}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setConfirmId(null)}
                    disabled={drop.isPending}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              ) : (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setConfirmId(row.student_id)}
                  className="gap-1"
                >
                  <UserMinus className="h-3 w-3" />
                  {t("management_course_enrollments.actions.drop")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab 2: Bulk add (paste UUIDs/emails or CSV upload) ─────────────── */

function BulkTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const bulk = useBulkEnroll(courseId);
  const csv = useImportEnrollmentsCsv(courseId);
  const [text, setText] = useState("");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [result, setResult] = useState<BulkEnrollResult | null>(null);

  const parsed = useMemo(() => {
    const userIds: string[] = [];
    const emails: string[] = [];
    const invalid: string[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (UUID_RE.test(line)) {
        userIds.push(line);
      } else if (line.includes("@")) {
        emails.push(line);
      } else {
        invalid.push(line);
      }
    }
    return { userIds, emails, invalid };
  }, [text]);

  function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    if (parsed.userIds.length === 0 && parsed.emails.length === 0) {
      toast.error(
        t("management_course_enrollments.errors.bulk_input_required"),
      );
      return;
    }
    bulk.mutate(
      { user_ids: parsed.userIds, emails: parsed.emails },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success(
            t("management_course_enrollments.toasts.bulk_added", {
              enrolled: data.enrolled.length,
              failures: data.failures.length,
            }),
          );
          setText("");
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_course_enrollments.toasts.bulk_failed"),
          ),
      },
    );
  }

  function handleCsvChange(file: File) {
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const csvText = String(reader.result ?? "");
      csv.mutate(
        { csv_text: csvText },
        {
          onSuccess: (data) => {
            setResult(data);
            toast.success(
              t("management_course_enrollments.toasts.bulk_added", {
                enrolled: data.enrolled.length,
                failures: data.failures.length,
              }),
            );
          },
          onError: (err) =>
            toast.error(
              (err as Error).message ||
                t("management_course_enrollments.toasts.csv_failed"),
            ),
        },
      );
    };
    reader.onerror = () =>
      toast.error(t("management_course_enrollments.toasts.read_file_failed"));
    reader.readAsText(file);
  }

  const submitting = bulk.isPending || csv.isPending;

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmitText}
        className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-4"
      >
        <div>
          <h2 className="text-sm font-bold text-m3-on-surface">
            {t("management_course_enrollments.bulk.label")}
          </h2>
          <p className="text-xs text-m3-on-surface-variant mt-1">
            {t("management_course_enrollments.bulk.hint")}
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={
            "user@example.com\n550e8400-e29b-41d4-a716-446655440000\nanother@example.com"
          }
          className="w-full px-4 py-3 text-sm font-mono bg-m3-surface-container-low border border-m3-outline-variant/30 rounded-xl text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/30 placeholder:text-m3-on-surface-variant/40"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-m3-on-surface-variant">
          <div className="flex gap-3">
            <span>
              UUID: <strong>{parsed.userIds.length}</strong>
            </span>
            <span>
              Email: <strong>{parsed.emails.length}</strong>
            </span>
            {parsed.invalid.length > 0 && (
              <span className="text-amber-700">
                {t("management_course_enrollments.bulk.invalid_count", {
                  count: parsed.invalid.length,
                })}
              </span>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={
              submitting ||
              (parsed.userIds.length === 0 && parsed.emails.length === 0)
            }
            className="gap-2"
          >
            {bulk.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t("management_course_enrollments.bulk.submit")}
          </Button>
        </div>
      </form>

      <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-3">
        <h2 className="text-sm font-bold text-m3-on-surface">
          {t("management_course_enrollments.bulk.csv_or")}
        </h2>
        <p className="text-xs text-m3-on-surface-variant">
          {t("management_course_enrollments.bulk.csv_hint")}
        </p>
        <FileDropzone
          onFile={handleCsvChange}
          accept=".csv,text/csv"
          compact
          disabled={submitting}
          busy={csv.isPending}
          idleTitle={t("management_course_enrollments.bulk.choose_csv")}
          hint={csvFileName ?? undefined}
        />
      </div>

      {result && (
        <BulkResultPanel result={result} onClose={() => setResult(null)} />
      )}
    </div>
  );
}

function BulkResultPanel({
  result,
  onClose,
}: {
  result: BulkEnrollResult;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const failureLabel = useFailureLabel();
  const [showFailures, setShowFailures] = useState(true);
  const grouped = useMemo(() => {
    const map = new Map<string, BulkEnrollFailure[]>();
    for (const f of result.failures) {
      const list = map.get(f.reason) ?? [];
      list.push(f);
      map.set(f.reason, list);
    }
    return Array.from(map.entries());
  }, [result.failures]);

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-m3-on-surface">
          {t("management_course_enrollments.bulk_result.title")}
        </h3>
        <Button size="xs" variant="ghost" onClick={onClose}>
          {t("common.close")}
        </Button>
      </div>
      <div className="flex gap-4 text-sm">
        <span className="text-emerald-700 font-semibold">
          {t("management_course_enrollments.bulk_result.added", {
            count: result.enrolled.length,
          })}
        </span>
        {result.failures.length > 0 && (
          <span className="text-amber-700 font-semibold">
            {t("management_course_enrollments.bulk_result.errors", {
              count: result.failures.length,
            })}
          </span>
        )}
      </div>

      {grouped.length > 0 && (
        <div className="border border-m3-outline-variant/20 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFailures((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 bg-m3-surface-container text-sm font-medium hover:bg-m3-surface-container-high transition-colors"
          >
            <span className="flex items-center gap-2 text-m3-on-surface">
              <AlertCircle className="h-4 w-4 text-amber-700" />
              {t("management_course_enrollments.bulk_result.error_details", {
                count: result.failures.length,
              })}
            </span>
            {showFailures ? (
              <ChevronUp className="h-4 w-4 text-m3-on-surface-variant" />
            ) : (
              <ChevronDown className="h-4 w-4 text-m3-on-surface-variant" />
            )}
          </button>
          {showFailures && (
            <div className="divide-y divide-m3-outline-variant/10">
              {grouped.map(([reason, items]) => (
                <div key={reason} className="px-4 py-3 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-m3-on-surface-variant">
                    {failureLabel(reason)} ({items.length})
                  </p>
                  <ul className="space-y-1 text-xs font-mono text-m3-on-surface">
                    {items.map((f, i) => (
                      <li key={`${reason}-${i}`} className="truncate">
                        {f.identifier}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tab 3: Invitation codes ────────────────────────────────────────── */

function CodesTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const list = useListInvitationCodes(courseId);
  const create = useCreateInvitationCode(courseId);
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [editing, setEditing] = useState<InvitationCodeAuthoring | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error(t("management_course_enrollments.errors.code_required"));
      return;
    }
    create.mutate(
      {
        code: code.trim(),
        expires_at: dateInputToIso(expiresAt),
        max_uses: maxUses ? Number(maxUses) : null,
      },
      {
        onSuccess: () => {
          toast.success(t("management_course_enrollments.toasts.code_created"));
          setCode("");
          setExpiresAt("");
          setMaxUses("");
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_course_enrollments.toasts.code_create_failed"),
          ),
      },
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-4"
      >
        <h2 className="text-sm font-bold text-m3-on-surface">
          {t("management_course_enrollments.codes.create_title")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("management_course_enrollments.codes.col_code")}{" "}
              <span className="text-red-600">*</span>
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t(
                "management_course_enrollments.codes.code_placeholder",
              )}
              className="text-sm font-mono"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("management_course_enrollments.codes.expires_label")}
            </label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("management_course_enrollments.codes.max_uses_label")}
            </label>
            <Input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder={t(
                "management_course_enrollments.codes.max_uses_placeholder",
              )}
              className="text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={create.isPending}
            className="gap-2"
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t("management_course_enrollments.codes.create_button")}
          </Button>
        </div>
      </form>

      <CodesList
        courseId={courseId}
        codes={list.data ?? []}
        isLoading={list.isLoading}
        isError={list.isError}
        onEdit={setEditing}
      />

      {editing && (
        <EditCodeModal
          courseId={courseId}
          item={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function CodesList({
  courseId,
  codes,
  isLoading,
  isError,
  onEdit,
}: {
  courseId: string;
  codes: InvitationCodeAuthoring[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (item: InvitationCodeAuthoring) => void;
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-14 bg-m3-surface-container animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {t("management_course_enrollments.errors.codes_load_failed")}
      </div>
    );
  }

  if (codes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-m3-on-surface-variant">
        <FileSpreadsheet className="h-8 w-8 opacity-30" />
        <p className="text-sm">
          {t("management_course_enrollments.codes.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1.5fr_120px_120px_120px_100px_140px] gap-4 px-5 py-3 border-b border-m3-outline-variant/10 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
        <span>{t("management_course_enrollments.codes.col_code")}</span>
        <span>{t("management_course_enrollments.roster.col_status")}</span>
        <span>{t("management_course_enrollments.codes.col_expires")}</span>
        <span>{t("management_course_enrollments.codes.col_uses")}</span>
        <span>{t("management_course_enrollments.codes.col_created")}</span>
        <span className="text-right">
          {t("management_course_enrollments.roster.col_actions")}
        </span>
      </div>
      <div className="divide-y divide-m3-outline-variant/10">
        {codes.map((c) => (
          <CodeRow
            key={c.id}
            courseId={courseId}
            item={c}
            onEdit={() => onEdit(c)}
          />
        ))}
      </div>
    </div>
  );
}

function CodeRow({
  courseId,
  item,
  onEdit,
}: {
  courseId: string;
  item: InvitationCodeAuthoring;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const del = useDeleteInvitationCode(item.id, courseId);
  const [confirming, setConfirming] = useState(false);

  function handleCopy() {
    void navigator.clipboard
      .writeText(item.code)
      .then(() =>
        toast.success(t("management_course_enrollments.toasts.code_copied")),
      )
      .catch(() =>
        toast.error(t("management_course_enrollments.toasts.copy_failed")),
      );
  }

  function handleDelete() {
    del.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("management_course_enrollments.toasts.code_deleted"));
        setConfirming(false);
      },
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("management_course_enrollments.toasts.code_delete_failed"),
        ),
    });
  }

  const limit =
    item.max_uses === null || item.max_uses === undefined
      ? "∞"
      : String(item.max_uses);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_120px_120px_120px_100px_140px] gap-4 px-5 py-3 items-center">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-mono font-semibold text-m3-on-surface truncate">
          {item.code}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          title={t("management_course_enrollments.codes.copy_tooltip")}
          className="text-m3-on-surface-variant hover:text-m3-primary transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
      <span
        className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-md w-fit",
          item.is_active
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-600",
        )}
      >
        {item.is_active
          ? t("management_course_enrollments.codes.active")
          : t("management_course_enrollments.codes.disabled")}
      </span>
      <span className="text-xs text-m3-on-surface-variant">
        {formatDate(item.expires_at)}
      </span>
      <span className="text-xs text-m3-on-surface-variant">
        {item.current_uses} / {limit}
      </span>
      <span className="text-xs text-m3-on-surface-variant">
        {formatDate(item.created_at)}
      </span>
      <div className="flex justify-end gap-1">
        {confirming ? (
          <>
            <Button
              size="xs"
              variant="destructive"
              onClick={handleDelete}
              disabled={del.isPending}
            >
              {del.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                t("common.confirm")
              )}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={del.isPending}
            >
              {t("common.cancel")}
            </Button>
          </>
        ) : (
          <>
            <Button size="xs" variant="outline" onClick={onEdit}>
              {t("management_course_enrollments.codes.edit_button")}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setConfirming(true)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function EditCodeModal({
  courseId,
  item,
  onClose,
}: {
  courseId: string;
  item: InvitationCodeAuthoring;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const patch = usePatchInvitationCode(item.id, courseId);
  const [isActive, setIsActive] = useState(item.is_active);
  const [expiresAt, setExpiresAt] = useState(
    formatDateInputValue(item.expires_at ?? null),
  );
  const [maxUses, setMaxUses] = useState(
    item.max_uses != null ? String(item.max_uses) : "",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    patch.mutate(
      {
        is_active: isActive,
        expires_at: dateInputToIso(expiresAt),
        max_uses: maxUses ? Number(maxUses) : null,
      },
      {
        onSuccess: () => {
          toast.success(t("management_course_enrollments.toasts.code_updated"));
          onClose();
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_course_enrollments.toasts.code_update_failed"),
          ),
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-popover rounded-xl shadow-lg p-6 space-y-5"
      >
        <div>
          <h2 className="text-lg font-headline font-bold text-m3-on-surface">
            {t("management_course_enrollments.codes.edit_title")}
          </h2>
          <p className="text-xs text-m3-on-surface-variant font-mono mt-1">
            {item.code}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-m3-outline-variant accent-m3-primary"
          />
          <span className="font-medium text-m3-on-surface">
            {t("management_course_enrollments.codes.active")}
          </span>
        </label>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_course_enrollments.codes.col_expires")}
          </label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_course_enrollments.codes.max_uses_label_short")}
          </label>
          <Input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder={t(
              "management_course_enrollments.codes.max_uses_placeholder",
            )}
            className="text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={patch.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={patch.isPending}
            className="gap-2"
          >
            {patch.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
