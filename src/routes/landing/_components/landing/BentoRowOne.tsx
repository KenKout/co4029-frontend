import { ArrowRight, Terminal, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SoftwareEngineeringTile() {
  return (
    <div
      className="relative rounded-xl overflow-hidden group cursor-pointer shadow-editorial reveal reveal-scale w-full h-full"
      style={{ "--reveal-delay": "0s" } as React.CSSProperties}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#1d4ed8]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <div className="absolute top-7 right-7 space-y-2 opacity-25 group-hover:opacity-40 transition-opacity">
        {[32, 20, 28, 16, 24].map((w, i) => (
          <div
            key={i}
            className="h-2 bg-white/60 rounded-full"
            style={{
              width: `${w * 4}px`,
              marginLeft: i % 2 === 0 ? 0 : "1rem",
            }}
          />
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-7">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-white" />
              </div>
              <Badge className="bg-white/15 text-white border-0 text-xs">
                2,400+ Courses
              </Badge>
            </div>
            <h3 className="font-headline font-bold text-2xl text-white">
              Software Engineering
            </h3>
            <p className="text-white/60 text-sm mt-1 max-w-xs">
              From algorithms to system design — master the full engineering
              stack.
            </p>
          </div>
          <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreativeArtsTile() {
  return (
    <div
      className="relative rounded-xl overflow-hidden group cursor-pointer shadow-editorial reveal reveal-scale w-full h-full"
      style={{ "--reveal-delay": "0.1s" } as React.CSSProperties}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#004a57] to-[#00796b]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
            <Palette className="w-4 h-4 text-white" />
          </div>
          <Badge className="bg-white/15 text-white border-0 text-xs">
            820+ Courses
          </Badge>
        </div>
        <h3 className="font-headline font-bold text-xl text-white">
          Creative Arts
        </h3>
        <p className="text-white/60 text-sm mt-1">
          Design, animation &amp; generative art.
        </p>
      </div>
    </div>
  );
}
