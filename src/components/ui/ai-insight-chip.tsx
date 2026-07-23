import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AIInsightChipProps {
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export function AIInsightChip({
  children,
  className,
  pulse = true,
}: AIInsightChipProps) {
  return (
    <Badge
      className={cn(
        "bg-m3-secondary-fixed text-m3-on-secondary-fixed border-0 gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs",
        pulse && "ai-pulse",
        className,
      )}
    >
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </Badge>
  );
}
