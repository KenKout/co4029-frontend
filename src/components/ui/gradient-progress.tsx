import { cn } from "@/lib/utils";

interface GradientProgressProps {
  value: number;
  max?: number;
  className?: string;
  variant?: "primary" | "secondary" | "success";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const gradientMap = {
  primary: "from-m3-primary to-m3-primary-container",
  secondary: "from-m3-secondary to-m3-secondary-container",
  success: "from-emerald-500 to-emerald-400",
};

const sizeMap = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function GradientProgress({
  value,
  max = 100,
  className,
  variant = "primary",
  showLabel = false,
  size = "md",
}: GradientProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-m3-on-surface-variant">
            Progress
          </span>
          <span className="text-xs font-semibold text-m3-on-surface">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-m3-surface-container-high overflow-hidden",
          sizeMap[size],
        )}
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out",
            gradientMap[variant],
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
