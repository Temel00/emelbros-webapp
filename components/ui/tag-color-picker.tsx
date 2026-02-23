import { cn } from "@/lib/utils";

const TAG_COLORS = [
  { value: "primary", label: "Pink", className: "bg-primary" },
  { value: "secondary", label: "Yellow", className: "bg-secondary" },
  { value: "tertiary", label: "Teal", className: "bg-tertiary" },
  { value: "accent", label: "Blue", className: "bg-accent" },
  { value: "destructive", label: "Red", className: "bg-destructive" },
] as const;

export type TagColor = (typeof TAG_COLORS)[number]["value"];

export function TagColorPicker({
  value,
  onChange,
}: {
  value: TagColor;
  onChange: (color: TagColor) => void;
}) {
  return (
    <div className="flex gap-2">
      {TAG_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={cn(
            "w-6 h-6 rounded-full border-2 transition-all",
            color.className,
            value === color.value
              ? "border-foreground scale-110"
              : "border-transparent hover:scale-105",
          )}
          title={color.label}
        />
      ))}
    </div>
  );
}
