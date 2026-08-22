import HeroCopy from "./HeroCopy";
import HeroVisual from "./HeroVisual";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden gradient-hero min-h-[92vh] flex items-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full bg-[#1d4ed8]/20 blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#1e40af]/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left copy */}
          <HeroCopy />

          {/* Right visual */}
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
