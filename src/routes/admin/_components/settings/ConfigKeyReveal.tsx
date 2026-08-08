import { useState } from "react";
import { Check, Code2, Copy } from "lucide-react";
import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { Button } from "@/components/ui/button";

/** Small </> button revealing the config key + env var, copy on click. */
export function ConfigKeyReveal({
  setting,
  forceShow,
}: {
  setting: RuntimeSetting;
  forceShow: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const text = setting.env_var
      ? `${setting.key} · ${setting.env_var}`
      : setting.key;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  if (forceShow) {
    return (
      <Button variant="ghost"
        type="button"
        onClick={copy}
        title="Copy config key"
        className="group inline-flex items-center gap-1 font-mono text-xs text-slate-400 hover:text-slate-700"
      >
        <span>{setting.key}</span>
        {setting.env_var && <span className="text-slate-300">·</span>}
        {setting.env_var && <span>{setting.env_var}</span>}
        {copied ? (
          <Check className="h-3 w-3 text-emerald-600" />
        ) : (
          <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </Button>
    );
  }

  return (
    <Button variant="ghost"
      type="button"
      onClick={copy}
      title={`${setting.key}${setting.env_var ? ` · ${setting.env_var}` : ""} — click to copy`}
      className="inline-flex items-center rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600 h-auto whitespace-normal"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Code2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
