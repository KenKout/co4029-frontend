import { useTranslation } from "react-i18next";

export function FooterBrandColumn() {
  const { i18n } = useTranslation();
  const vi = i18n.resolvedLanguage?.startsWith("vi");
  return (
    <div className="lg:col-span-6 space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tracking-tighter text-white font-headline">
          aBridgeAI
        </span>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
        {vi
          ? "Kết nối tài liệu giảng dạy, hoạt động duyệt của giảng viên và bằng chứng học tập. Một lộ trình rõ ràng hơn từ nội dung giảng dạy đến mức độ thấu hiểu."
          : "Connect teaching materials, instructor review and learning evidence. A clearer path from what you teach to what learners understand."}
      </p>
      {/* The GitHub / X / LinkedIn icon row was removed: all three were
          `href="#"`, and each rendered an anchor with no text and no
          aria-label, so a screen reader announced three unlabelled links to
          nowhere. Restore them here only alongside real profile URLs and
          accessible names. */}
    </div>
  );
}
