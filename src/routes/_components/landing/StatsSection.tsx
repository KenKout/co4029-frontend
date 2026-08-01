import { AnimatedCounter } from "@/components/ui/animated-counter";
import { stats } from "./constants";

export default function StatsSection() {
  return (
    <section className="bg-m3-surface-container-lowest border-y border-m3-outline-variant/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="text-center space-y-1.5 reveal reveal-up"
              style={{ "--reveal-delay": `${i * 0.1}s` } as React.CSSProperties}
            >
              <AnimatedCounter
                value={stat.value}
                className="font-headline font-extrabold text-3xl sm:text-4xl text-gradient-primary inline-block"
              />
              <p className="text-sm text-m3-on-surface-variant font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
