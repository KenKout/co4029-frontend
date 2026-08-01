import { useTranslation } from "react-i18next";
import { FAILURE_KEY } from "./constants";

/**
 * Resolves a backend failure reason to a translated label, falling back to the
 * raw reason when the backend sends one we have no copy for.
 */
export function useFailureLabel() {
  const { t } = useTranslation();
  return (reason: string): string => {
    const key = FAILURE_KEY[reason];
    return key ? t(key) : reason;
  };
}
