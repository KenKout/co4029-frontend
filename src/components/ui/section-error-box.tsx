import { useTranslation } from "react-i18next";

/**
 * "This panel failed to load" card, scoped to one section of a page.
 *
 * Lives in `ui/` rather than beside one dashboard because both the AI-cost page
 * and the operator overview render it.
 */
export function SectionErrorBox({ messageKey }: { messageKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-5">
      <p className="text-sm text-danger">{t(messageKey)}</p>
    </div>
  );
}

export default SectionErrorBox;
