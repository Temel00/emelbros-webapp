"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Package, BookOpen, CalendarDays, ShoppingCart } from "lucide-react";

const TABS = [
  { href: "/dashboard/food/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/food/recipes", label: "Recipes", icon: BookOpen },
  {
    href: "/dashboard/food/meal-planning",
    label: "Meal Plan",
    icon: CalendarDays,
  },
  {
    href: "/dashboard/food/shopping-list",
    label: "Shopping",
    icon: ShoppingCart,
  },
] as const;

export function FoodTabs() {
  const pathname = usePathname();

  return (
    <div className="w-full max-w-5xl px-5">
      <nav className="flex gap-1 items-end">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-[8px] border border-b-0 transition-colors",
                isActive
                  ? "bg-card/40 text-foreground z-10 -mb-px"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
