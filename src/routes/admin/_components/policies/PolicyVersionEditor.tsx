import { useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  Bold,
  Code,
  Hash,
  Image,
  Italic,
  Link as LinkIcon,
  List,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichContent } from "@/components/ui/rich-content";
import { ToolbarBtn, makeMarkdownApplier } from "@/components/ui/markdown-toolbar";
import { cn } from "@/lib/utils";
import {
  usePublishPolicyVersion,
  useUpdatePolicyDraft,
  type PolicyVersionRead,
} from "@/lib/api/hooks/policies";

/**
 * Edit and release one draft version.
 *
 * Only drafts are editable: published text is what readers have already been
 * shown, and silently rewriting it under them would make the version number
 * meaningless. Revising a live policy therefore means opening a new draft —
 * handled by the parent — and this component only ever sees that draft.
 *
 * Save and publish are separate actions on purpose. Publishing is the moment
 * the text becomes what every reader sees, so it should never be something an
 * admin does by reflex while still writing.
 */
export function PolicyVersionEditor({
  policyId,
  draft,
  bodyProse,
  onDirtyChange,
  registerActions,
}: {
  policyId: string;
  /** Always the full version, body included — the parent fetches it. */
  draft: PolicyVersionRead;
  /** Reader typography, passed in so the preview matches the public page. */
  bodyProse: string;
  /** Reports the draft text's unsaved state to the shared action bar. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Registers save/publish so the shared sticky bar can trigger them. */
  registerActions?: (actions: {
    save: () => Promise<boolean>;
    publish: () => Promise<void>;
    savePending: () => boolean;
    publishPending: () => boolean;
    canPublish: () => boolean;
  } | null) => void;
}) {
  const { t } = useTranslation();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // These initialisers are the only load. The parent keys this component on the
  // draft id, so switching drafts remounts rather than resyncing — which also
  // means an unrelated background refetch cannot discard an edit in progress,
  // as a value-watching effect would have done.
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [changelog, setChangelog] = useState(draft.changelog ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");

  const update = useUpdatePolicyDraft(policyId, draft.id);
  const publish = usePublishPolicyVersion(policyId);

  const { applyMarkdown, applyBlock } = makeMarkdownApplier(
    () => bodyRef.current,
    () => body,
    setBody,
  );

  const dirty =
    title !== draft.title ||
    body !== draft.body ||
    changelog !== (draft.changelog ?? "");

  async function handleSave(): Promise<boolean> {
    try {
      await update.mutateAsync({ title, body, changelog: changelog || null });
      toast.success(t("admin.policies.toasts.saved"));
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("admin.policies.toasts.save_failed"),
      );
      return false;
    }
  }

  async function handlePublish() {
    // Publish what is on screen, not what was last saved: an admin who edits
    // and hits Publish means the text in front of them.
    if (dirty && !(await handleSave())) return;
    try {
      await publish.mutateAsync(draft.id);
      toast.success(t("admin.policies.toasts.published"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.policies.toasts.publish_failed"),
      );
    }
  }

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  // Register the latest actions; unregister (null) on unmount.
  const actionsRef = useRef({ save: handleSave, publish: handlePublish });
  actionsRef.current = { save: handleSave, publish: handlePublish };
  useEffect(() => {
    registerActions?.({
      save: () => actionsRef.current.save(),
      publish: () => actionsRef.current.publish(),
      savePending: () => update.isPending,
      publishPending: () => publish.isPending,
      canPublish: () => Boolean(body.trim()),
    });
    return () => registerActions?.(null);
  }, [registerActions]);

  return (
    <section className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold text-text-strong">
          {t("admin.policies.fields.title")}
        </span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
      </label>

      <div className="overflow-hidden rounded-xl border border-m3-outline-variant/20 shadow-sm">
        <div className="flex items-center gap-2 border-b border-m3-outline-variant/10 bg-m3-primary/5 px-4 py-2">
          <AlignLeft className="h-3.5 w-3.5 text-m3-secondary" />
          <span className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("admin.policies.editor_title")}
          </span>
          <div className="ml-auto flex items-center gap-1">
            {(["write", "preview"] as const).map((key) => (
              <Button
                key={key}
                variant="ghost"
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors h-auto",
                  tab === key
                    ? "bg-white text-m3-primary shadow-sm"
                    : "text-m3-on-surface-variant hover:bg-m3-surface-container-high",
                )}
              >
                {t(`admin.policies.${key}_tab`)}
              </Button>
            ))}
          </div>
        </div>

        {tab === "write" ? (
          <>
            <EditorToolbar applyMarkdown={applyMarkdown} applyBlock={applyBlock} />
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[420px] w-full resize-y bg-m3-surface-container-lowest p-6 font-body text-base leading-relaxed text-m3-on-surface outline-none placeholder:text-m3-on-surface-variant/40"
              placeholder={"## Section\n\nPolicy text.\n\n- Obligation\n- Obligation"}
            />
          </>
        ) : (
          // Rendered exactly as /policy/$slug renders it, so what the admin
          // approves is what the reader gets.
          <div className="bg-white p-6">
            <RichContent value={body} format="markdown" className={bodyProse} />
          </div>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-text-strong">
          {t("admin.policies.fields.changelog")}
        </span>
        <Input
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          className="mt-1"
        />
        <span className="mt-1 block text-xs text-text-muted">
          {t("admin.policies.changelog_hint")}
        </span>
      </label>
    </section>
  );
}

/** The markdown formatting row above the body textarea. */
function EditorToolbar({
  applyMarkdown,
  applyBlock,
}: {
  applyMarkdown: (before: string, after?: string) => void;
  applyBlock: (prefix: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-m3-outline-variant/10 px-2 py-1">
      <ToolbarBtn icon={Bold} label="Bold" onClick={() => applyMarkdown("**")} />
      <ToolbarBtn icon={Italic} label="Italic" onClick={() => applyMarkdown("*")} />
      <ToolbarBtn icon={Hash} label="Section heading" onClick={() => applyBlock("## ")} />
      <ToolbarBtn icon={List} label="List item" onClick={() => applyBlock("- ")} />
      <ToolbarBtn
        icon={LinkIcon}
        label="Link"
        onClick={() => applyMarkdown("[", "](url)")}
      />
      <ToolbarBtn
        icon={Image}
        label="Image"
        onClick={() => applyMarkdown("![alt](", ")")}
      />
      <ToolbarBtn
        icon={Code}
        label="Code block"
        onClick={() => applyMarkdown("```\n", "\n```")}
      />
      <span className="ml-auto pr-2 text-xs text-m3-on-surface-variant/50">
        {t("admin.policies.editor_hint")}
      </span>
    </div>
  );
}
