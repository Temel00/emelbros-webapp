import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TAG_COLOR_STYLES = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  tertiary: "bg-tertiary text-tertiary-foreground",
  accent: "bg-accent text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground",
} as const;

export function TagBadge({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  const colorStyle =
    TAG_COLOR_STYLES[color as keyof typeof TAG_COLOR_STYLES] ||
    TAG_COLOR_STYLES.primary;

  return (
    <Badge className={cn("text-xs", colorStyle, className)} variant="default">
      {name}
    </Badge>
  );
}
