interface ColorSwatchProps {
  color: string;
}

type colorMap = Record<string, string>;

export function ColorSwatch({ color }: ColorSwatchProps) {
  const colorVariants: colorMap = {
    background: "bg-background text-foreground",
    foreground: "bg-foreground text-background",
    card: "bg-card text-card-foreground",
    "card-foreground": "bg-card-foreground text-card",
    popover: "bg-popover text-popover-foreground",
    "popover-foreground": "bg-popover-foreground text-popover",
    primary: "bg-primary text-primary-foreground",
    "primary-foreground": "bg-primary-foreground text-primary",
    secondary: "bg-secondary text-secondary-foreground",
    "secondary-foreground": "bg-secondary-foreground text-secondary",
    tertiary: "bg-tertiary text-tertiary-foreground",
    "tertiary-foreground": "bg-tertiary-foreground text-tertiary",
    accent: "bg-accent text-accent-foreground",
    "accent-foreground": "bg-accent-foreground text-accent",
    destructive: "bg-destructive text-destructive-foreground",
    "destructive-foreground": "bg-destructive-foreground text-destructive",
    border: "bg-border text-foreground",
    input: "bg-input text-foreground",
    ring: "bg-ring text-background",
  };

  return (
    <div className={`flex p-4 border ${colorVariants[color]}`}>
      <h3>{color}</h3>
    </div>
  );
}
