export default function TestimonialVisual() {
  return (
    <div
      className="relative flex justify-center lg:justify-end reveal reveal-right"
      style={{ "--reveal-delay": "0.2s" } as React.CSSProperties}
    >
      <div className="relative">
        <div className="relative w-72 h-80 rounded-xl overflow-hidden shadow-2xl rotate-3 hover:rotate-1 transition-transform duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e40af] via-[#1d4ed8] to-[#3b82f6]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
              <span className="font-headline font-bold text-white text-3xl">
                JR
              </span>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Full-Stack Engineer</p>
              <p className="text-white/50 text-sm">Completed 14 courses</p>
            </div>
            <div className="w-full space-y-1.5">
              <div className="flex justify-between text-xs text-white/60">
                <span>Skill Progress</span>
                <span>96%</span>
              </div>
              <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full w-[96%] bg-gradient-to-r from-[#bfdbfe] to-[#3b82f6] rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 w-72 h-80 rounded-xl bg-gradient-to-br from-[#1e3a8a]/50 to-[#3b82f6]/30 -rotate-3 -z-10 blur-sm" />
        <div className="absolute -top-4 -left-6 animate-float">
          <div className="glass-dark ghost-border rounded-xl px-4 py-2.5 text-center">
            <p className="font-headline font-bold text-white text-lg">4.9</p>
            <p className="text-xs text-white/50">Avg. rating</p>
          </div>
        </div>
      </div>
    </div>
  );
}
