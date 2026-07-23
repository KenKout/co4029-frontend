import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

const statCardVariants = cva("rounded-xl p-5 transition-colors duration-200", {
  variants: {
    variant: {
      default:
        "bg-card shadow-editorial ghost-border hover:border-border-strong",
      primary: "gradient-primary text-white",
      glow: "bg-card shadow-ai-glow ghost-border",
      surface: "bg-m3-surface-container-low",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface StatCardProps extends VariantProps<typeof statCardVariants> {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  trend,
  variant,
  className,
}: StatCardProps) {
  const isPrimary = variant === "primary";

  return (
    <div className={cn(statCardVariants({ variant }), className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p
            className={cn(
              "text-xs font-medium uppercase tracking-wider",
              isPrimary ? "text-white/70" : "text-m3-on-surface-variant",
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "text-2xl font-heading font-semibold",
              isPrimary ? "text-white" : "text-m3-on-surface",
            )}
          >
            {value}
          </p>
          {sublabel && (
            <p
              className={cn(
                "text-xs",
                isPrimary ? "text-white/60" : "text-m3-on-surface-variant",
              )}
            >
              {sublabel}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isPrimary ? "bg-white/15" : "bg-m3-primary-fixed",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                isPrimary ? "text-white" : "text-m3-primary",
              )}
            />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-semibold",
              trend.positive
                ? isPrimary
                  ? "text-emerald-200"
                  : "text-emerald-600"
                : isPrimary
                  ? "text-red-200"
                  : "text-red-500",
            )}
          >
            {trend.positive ? "+" : ""}
            {trend.value}%
          </span>
          <span
            className={cn(
              "text-xs",
              isPrimary ? "text-white/60" : "text-m3-on-surface-variant",
            )}
          >
            vs last week
          </span>
        </div>
      )}
    </div>
  );
}
