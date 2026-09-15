import { useState, type ReactNode, type RefObject } from "react";
import { AlignLeft, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { RichContent } from "@/components/ui/rich-content";
import { cn } from "@/lib/utils";

type EditorTab = "write" | "preview";

/** Shared Markdown authoring surface used by reading and video lessons. */
export function MarkdownEditorSurface({
  value,
  onChange,
  editorRef,
  placeholder,
  toolbar,
  minHeight = "min-h-[240px]",
}: {
  value: string;
  onChange: (value: string) => void;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  placeholder: string;
  toolbar: ReactNode;
  minHeight?: string;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<EditorTab>("write");

  return (
    <div className="overflow-hidden rounded-xl border border-m3-outline-variant/20 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-m3-outline-variant/10 bg-m3-primary/5 px-4 py-2">
        {tab === "write" ? (
          <AlignLeft className="h-3.5 w-3.5 text-m3-secondary" />
        ) : (
          <Eye className="h-3.5 w-3.5 text-m3-secondary" />
        )}
        <span className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_lesson_manage.editor.label")}
        </span>
        <div
          className="ml-auto flex items-center gap-1"
          role="tablist"
          aria-label={t("teacher_lesson_manage.editor.label")}
        >
          {(["write", "preview"] as const).map((key) => (
            <Button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              variant="ghost"
              onClick={() => setTab(key)}
              className={cn(
                "h-auto rounded-lg px-2.5 py-1 text-xs font-semibold",
                tab === key
                  ? "bg-white text-m3-primary shadow-sm"
                  : "text-m3-on-surface-variant",
              )}
            >
              {t(`teacher_lesson_manage.editor.${key}`)}
            </Button>
          ))}
        </div>
      </div>

      {tab === "write" ? (
        <>
          <div className="flex flex-wrap items-center gap-1 border-b border-m3-outline-variant/10 bg-card px-2 py-1">
            {toolbar}
            <span className="ml-auto px-2 text-xs text-m3-on-surface-variant/50">
              {t("teacher_lesson_manage.editor.hint")}
            </span>
          </div>
          <textarea
            ref={editorRef}
            className={cn(
              minHeight,
              "w-full resize-y bg-m3-surface-container-lowest p-4 font-body text-base leading-relaxed text-m3-on-surface outline-none placeholder:text-m3-on-surface-variant/40 sm:p-6",
            )}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </>
      ) : (
        <div className={cn(minHeight, "bg-white p-4 sm:p-6")} role="tabpanel">
          {value.trim() ? (
            <RichContent value={value} format="markdown" />
          ) : (
            <p className="text-sm italic text-m3-on-surface-variant">
              {t("teacher_lesson_manage.editor.empty_preview")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
