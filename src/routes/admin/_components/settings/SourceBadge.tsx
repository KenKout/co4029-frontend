import type { SettingSource } from "@/lib/api/hooks/admin-settings";
import { SOURCE_META } from "./constants";

export function SourceBadge({ source }: { source: SettingSource }) {
  const m = SOURCE_META[source];
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${m.badge}`}
    >
      {m.label}
    </span>
  );
}
