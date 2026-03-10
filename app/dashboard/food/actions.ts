"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserHouseholdId } from "@/lib/supabase/household";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UpcomingMeal = {
  id: string;
  scheduled_date: string;
  cook_time: string | null;
  recipe: { id: string; name: string; total_minutes: number | null };
};

export type FoodSummary = {
  upcomingMeals: UpcomingMeal[];
  shoppingList: { total: number; unpurchased: number };
  inventory: { total: number; lowStock: number; outOfStock: number };
  recipes: { total: number };
  tools: { total: number };
  vendors: { total: number };
  household: { name: string; memberCount: number } | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Summary Fetch
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchFoodSummary(): Promise<FoodSummary> {
  const supabase = await createClient();
  const householdId = await getUserHouseholdId();

  const today = new Date().toISOString().split("T")[0];

  const [
    mealsResult,
    shoppingTotalResult,
    shoppingUnpurchasedResult,
    inventoryResult,
    recipesResult,
    toolsResult,
    vendorsResult,
    householdResult,
    membersResult,
  ] = await Promise.all([
    // Next 5 upcoming meals
    supabase
      .from("meal_plans")
      .select("id, scheduled_date, cook_time, recipe:recipes(id, name, total_minutes)")
      .eq("household_id", householdId)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .order("cook_time", { ascending: true, nullsFirst: false })
      .limit(5),

    // Shopping list total count
    supabase
      .from("shopping_list_items")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId),

    // Shopping list unpurchased count
    supabase
      .from("shopping_list_items")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .eq("purchased", false),

    // Inventory: all items
    supabase
      .from("inventory")
      .select("id, on_hand_qty", { count: "exact" })
      .eq("household_id", householdId),

    // Recipes count
    supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId),

    // Tools count
    supabase
      .from("tools")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId),

    // Vendors count
    supabase
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId),

    // Household info
    supabase
      .from("households")
      .select("name")
      .eq("id", householdId)
      .single(),

    // Household member count
    supabase
      .from("household_members")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId),
  ]);

  // Compute low/out of stock from inventory data
  const inventoryItems = inventoryResult.data ?? [];
  const outOfStock = inventoryItems.filter((i) => i.on_hand_qty <= 0).length;
  const lowStock = inventoryItems.filter(
    (i) => i.on_hand_qty > 0 && i.on_hand_qty < 1,
  ).length;

  return {
    upcomingMeals: (mealsResult.data ?? []) as unknown as UpcomingMeal[],
    shoppingList: {
      total: shoppingTotalResult.count ?? 0,
      unpurchased: shoppingUnpurchasedResult.count ?? 0,
    },
    inventory: {
      total: inventoryResult.count ?? 0,
      lowStock,
      outOfStock,
    },
    recipes: { total: recipesResult.count ?? 0 },
    tools: { total: toolsResult.count ?? 0 },
    vendors: { total: vendorsResult.count ?? 0 },
    household: householdResult.data
      ? {
          name: householdResult.data.name,
          memberCount: membersResult.count ?? 0,
        }
      : null,
  };
}
