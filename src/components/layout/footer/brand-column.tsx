export function FooterBrandColumn() {
  return (
    <div className="lg:col-span-6 space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tracking-tighter text-white font-headline">
          aBridgeAI
        </span>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
        Personalizing education through the synergy of artificial intelligence
        and human curiosity. Next-generation learning infrastructure.
      </p>
      {/* The GitHub / X / LinkedIn icon row was removed: all three were
          `href="#"`, and each rendered an anchor with no text and no
          aria-label, so a screen reader announced three unlabelled links to
          nowhere. Restore them here only alongside real profile URLs and
          accessible names. */}
    </div>
  );
}
