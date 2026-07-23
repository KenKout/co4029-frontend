import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function GlassCard({
  children,
  header,
  footer,
  className,
  ...props
}: GlassCardProps) {
  return (
    <Card
      className={cn(
        "glass ghost-border shadow-glass rounded-xl overflow-hidden",
        className,
      )}
      {...props}
    >
      {header && <CardHeader>{header}</CardHeader>}
      <CardContent className="p-0">{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
