import { useTranslation } from "react-i18next";

/**
 * The dashboard's shared "this panel failed to load" card. Renders the exact
 * markup each section repeated inline before the split.
 */
export function SectionErrorBox({ messageKey }: { messageKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-5">
      <p className="text-sm text-danger">{t(messageKey)}</p>
    </div>
  );
}
