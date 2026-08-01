import { useTranslation } from "react-i18next";
import { Bot } from "lucide-react";

export default function AskAiFab({
  fabHovered,
  setFabHovered,
}: {
  fabHovered: boolean;
  setFabHovered: (next: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <div
        className={`transition-all duration-200 origin-bottom-right ${
          fabHovered
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-1 pointer-events-none"
        }`}
      >
        <div className="bg-m3-on-surface text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-editorial whitespace-nowrap">
          {t("dashboard.ask_ai")}
        </div>
      </div>

      <button
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => setFabHovered(false)}
        onFocus={() => setFabHovered(true)}
        onBlur={() => setFabHovered(false)}
        className="cursor-pointer gradient-primary text-white w-14 h-14 rounded-xl flex items-center justify-center shadow-ai-glow hover:opacity-90 active:scale-95 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-secondary"
        aria-label={t("dashboard.ask_ai")}
      >
        <Bot className="h-6 w-6" />
      </button>
    </div>
  );
}
