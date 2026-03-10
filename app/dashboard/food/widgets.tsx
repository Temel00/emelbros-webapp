"use client";

import Link from "next/link";

import type { FoodSummary, UpcomingMeal } from "./actions";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  CalendarDays,
  ChefHat,
  CookingPot,
  Package,
  ShoppingCart,
  Store,
  Users,
  ArrowRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function SummaryDashboard({ summary }: { summary: FoodSummary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <MealPlanCard meals={summary.upcomingMeals} />
      <ShoppingListCard
        total={summary.shoppingList.total}
        unpurchased={summary.shoppingList.unpurchased}
      />
      <InventoryCard
        total={summary.inventory.total}
        lowStock={summary.inventory.lowStock}
        outOfStock={summary.inventory.outOfStock}
      />
      <RecipesCard total={summary.recipes.total} />
      <ToolsCard total={summary.tools.total} />
      <VendorsCard total={summary.vendors.total} />
      {summary.household && (
        <HouseholdCard
          name={summary.household.name}
          memberCount={summary.household.memberCount}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCard({
  href,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </div>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </Link>
  );
}

function StatRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: "default" | "warning" | "destructive";
}) {
  const colorClass =
    variant === "destructive"
      ? "text-destructive"
      : variant === "warning"
        ? "text-secondary"
        : "";

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={colorClass}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Components
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function MealPlanCard({ meals }: { meals: UpcomingMeal[] }) {
  return (
    <SummaryCard
      href="/dashboard/food/meal-planning"
      icon={CalendarDays}
      title="Meal Planning"
      subtitle={
        meals.length > 0
          ? `${meals.length} upcoming meal${meals.length !== 1 ? "s" : ""}`
          : undefined
      }
    >
      {meals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming meals planned.</p>
      ) : (
        <ul className="space-y-2">
          {meals.map((meal) => (
            <li key={meal.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="shrink-0 text-xs">
                  {formatDate(meal.scheduled_date)}
                </Badge>
                <span className="truncate">{meal.recipe.name}</span>
              </div>
              {meal.cook_time && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {meal.cook_time}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

function ShoppingListCard({
  total,
  unpurchased,
}: {
  total: number;
  unpurchased: number;
}) {
  const purchased = total - unpurchased;

  return (
    <SummaryCard
      href="/dashboard/food/shopping-list"
      icon={ShoppingCart}
      title="Shopping List"
      subtitle={total > 0 ? `${purchased}/${total} purchased` : undefined}
    >
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">No items on your list.</p>
      ) : (
        <div className="space-y-2">
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-tertiary h-full rounded-full transition-all"
              style={{
                width: `${total > 0 ? (purchased / total) * 100 : 0}%`,
              }}
            />
          </div>
          <StatRow label="Still needed" value={unpurchased} variant={unpurchased > 0 ? "warning" : "default"} />
        </div>
      )}
    </SummaryCard>
  );
}

function InventoryCard({
  total,
  lowStock,
  outOfStock,
}: {
  total: number;
  lowStock: number;
  outOfStock: number;
}) {
  return (
    <SummaryCard
      href="/dashboard/food/inventory"
      icon={Package}
      title="Inventory"
      subtitle={`${total} item${total !== 1 ? "s" : ""} tracked`}
    >
      <div className="space-y-1">
        <StatRow label="In stock" value={total - lowStock - outOfStock} />
        <StatRow label="Low stock" value={lowStock} variant={lowStock > 0 ? "warning" : "default"} />
        <StatRow label="Out of stock" value={outOfStock} variant={outOfStock > 0 ? "destructive" : "default"} />
      </div>
    </SummaryCard>
  );
}

function RecipesCard({ total }: { total: number }) {
  return (
    <SummaryCard
      href="/dashboard/food/recipes"
      icon={ChefHat}
      title="Recipes"
      subtitle={`${total} recipe${total !== 1 ? "s" : ""}`}
    >
      <p className="text-sm text-muted-foreground">
        Browse and manage your recipe collection.
      </p>
    </SummaryCard>
  );
}

function ToolsCard({ total }: { total: number }) {
  return (
    <SummaryCard
      href="/dashboard/food/tools"
      icon={CookingPot}
      title="Tools"
      subtitle={`${total} tool${total !== 1 ? "s" : ""}`}
    >
      <p className="text-sm text-muted-foreground">
        Kitchen tools and equipment.
      </p>
    </SummaryCard>
  );
}

function VendorsCard({ total }: { total: number }) {
  return (
    <SummaryCard
      href="/dashboard/food/vendors"
      icon={Store}
      title="Vendors"
      subtitle={`${total} vendor${total !== 1 ? "s" : ""}`}
    >
      <p className="text-sm text-muted-foreground">
        Vendor product mappings and UPCs.
      </p>
    </SummaryCard>
  );
}

function HouseholdCard({
  name,
  memberCount,
}: {
  name: string;
  memberCount: number;
}) {
  return (
    <SummaryCard
      href="/dashboard/food/household"
      icon={Users}
      title="Household"
      subtitle={name}
    >
      <StatRow label="Members" value={memberCount} />
    </SummaryCard>
  );
}
