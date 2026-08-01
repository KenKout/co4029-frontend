import { ArrowRight, BarChart3, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DigitalBusinessTile() {
  return (
    <div
      className="relative rounded-xl overflow-hidden group cursor-pointer shadow-editorial bg-m3-primary-fixed reveal reveal-scale w-full h-full"
      style={{ "--reveal-delay": "0.2s" } as React.CSSProperties}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-m3-primary-fixed via-m3-secondary-fixed/40 to-m3-primary-fixed" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <Badge className="bg-m3-primary/10 text-m3-primary border-0 text-xs">
            1,100+ Courses
          </Badge>
        </div>
        <h3 className="font-headline font-bold text-xl text-m3-on-surface">
          Digital Business
        </h3>
        <p className="text-m3-on-surface-variant text-sm mt-1">
          Marketing, growth &amp; entrepreneurship.
        </p>
      </div>
    </div>
  );
}

export function DataScienceTile() {
  return (
    <div
      className="relative rounded-xl overflow-hidden group cursor-pointer shadow-editorial reveal reveal-scale w-full h-full"
      style={{ "--reveal-delay": "0.3s" } as React.CSSProperties}
    >
      <div className="absolute inset-0 gradient-secondary" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-white" />
              </div>
              <Badge className="bg-white/15 text-white border-0 text-xs">
                3,200+ Courses
              </Badge>
            </div>
            <h3 className="font-headline font-bold text-xl text-white">
              Data Science
            </h3>
            <p className="text-white/60 text-sm mt-1">
              ML, analytics, AI &amp; data engineering.
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
