"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { convertWithDensity } from "@/lib/unit-conversions";

export type ActionState = {
  ok: boolean;
  error?: string;
};

export type ShoppingListItem = {
  id: string;
  inventory_id: string | null;
  name: string;
  needed_qty: number;
  unit: string;
  purchased: boolean;
  created_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchShoppingList(): Promise<ShoppingListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shopping_list_items")
    .select("*")
    .order("purchased", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []) as ShoppingListItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate
// ─────────────────────────────────────────────────────────────────────────────

type IngredientRow = {
  recipe_id: string;
  amount: number | null;
  unit: string | null;
  inventory_id: string;
  inventory: {
    id: string;
    name: string;
    on_hand_qty: number;
    unit: string | null;
    density: number;
  } | null;
};

export async function generateShoppingList(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const startDate = String(formData.get("start_date") || "").trim();
  const endDate = String(formData.get("end_date") || "").trim();

  if (!startDate || !endDate) {
    return { ok: false, error: "Start and end dates are required" };
  }
  if (startDate > endDate) {
    return { ok: false, error: "Start date must be before end date" };
  }

  // 1. Get all meal plans in the date range
  const { data: mealPlans, error: mealError } = await supabase
    .from("meal_plans")
    .select("recipe_id")
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate);

  if (mealError) return { ok: false, error: mealError.message };
  if (!mealPlans?.length) {
    return { ok: false, error: "No meals planned in this date range" };
  }

  // Count how many times each recipe appears (same recipe on multiple days = multiply amounts)
  const recipeCounts = new Map<string, number>();
  for (const mp of mealPlans) {
    recipeCounts.set(mp.recipe_id, (recipeCounts.get(mp.recipe_id) ?? 0) + 1);
  }
  const recipeIds = [...recipeCounts.keys()];

  // 2. Get recipe ingredients with inventory data for all planned recipes
  const { data: rawIngredients, error: ingError } = await supabase
    .from("recipe_ingredients")
    .select(
      "recipe_id, amount, unit, inventory_id, inventory:inventory(id, name, on_hand_qty, unit, density)",
    )
    .in("recipe_id", recipeIds);

  if (ingError) return { ok: false, error: ingError.message };

  const ingredients = (rawIngredients ?? []) as unknown as IngredientRow[];

  // 3. Aggregate needed amounts per inventory item
  type NeedEntry = {
    inventory_id: string;
    name: string;
    total: number;
    unit: string;
    on_hand: number;
    convertible: boolean;
  };

  const needsMap = new Map<string, NeedEntry>();

  for (const ing of ingredients) {
    if (!ing.inventory || ing.amount == null || !ing.unit) continue;

    const inv = ing.inventory;
    const invUnit = inv.unit;
    const count = recipeCounts.get(ing.recipe_id) ?? 1;
    const totalRecipeNeed = Number(ing.amount) * count;

    if (!invUnit) {
      // No inventory unit — include unconditionally using recipe unit
      const key = `${ing.inventory_id}::${ing.unit}`;
      const existing = needsMap.get(key);
      needsMap.set(key, {
        inventory_id: ing.inventory_id,
        name: inv.name,
        total: (existing?.total ?? 0) + totalRecipeNeed,
        unit: ing.unit,
        on_hand: 0,
        convertible: false,
      });
      continue;
    }

    // Try to convert recipe amount to the inventory's native unit (handles weight↔volume via density)
    const converted = convertWithDensity(
      totalRecipeNeed,
      ing.unit,
      invUnit,
      inv.density ?? 1,
    );

    if (converted !== null) {
      // Units are compatible — aggregate in the inventory's unit
      const existing = needsMap.get(ing.inventory_id);
      needsMap.set(ing.inventory_id, {
        inventory_id: ing.inventory_id,
        name: inv.name,
        total: (existing?.convertible ? existing.total : 0) + converted,
        unit: invUnit,
        on_hand: inv.on_hand_qty,
        convertible: true,
      });
    } else {
      // Incompatible units — track separately, include unconditionally
      const key = `${ing.inventory_id}::${ing.unit}`;
      const existing = needsMap.get(key);
      needsMap.set(key, {
        inventory_id: ing.inventory_id,
        name: inv.name,
        total: (existing?.total ?? 0) + totalRecipeNeed,
        unit: ing.unit,
        on_hand: 0,
        convertible: false,
      });
    }
  }

  // 4. Build the shopping list: only items where we don't have enough
  const toInsert: {
    inventory_id: string;
    name: string;
    needed_qty: number;
    unit: string;
    purchased: boolean;
  }[] = [];

  for (const [, need] of needsMap) {
    let buyQty: number;

    if (need.convertible) {
      buyQty = need.total - need.on_hand;
      if (buyQty <= 0.001) continue; // Already have enough
    } else {
      // Can't compare to inventory — always include
      buyQty = need.total;
    }

    toInsert.push({
      inventory_id: need.inventory_id,
      name: need.name,
      needed_qty: Math.round(buyQty * 1000) / 1000,
      unit: need.unit,
      purchased: false,
    });
  }

  // 5. Replace current shopping list
  await supabase
    .from("shopping_list_items")
    .delete()
    .not("id", "is", null);

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("shopping_list_items")
      .insert(toInsert);
    if (insertError) return { ok: false, error: insertError.message };
  }

  revalidatePath("/dashboard/food/shopping-list");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Clear & Toggle
// ─────────────────────────────────────────────────────────────────────────────

export async function clearShoppingList(): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_list_items")
    .delete()
    .not("id", "is", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/food/shopping-list");
  return { ok: true };
}

export async function togglePurchased(
  id: string,
  purchased: boolean,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_list_items")
    .update({ purchased })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/food/shopping-list");
  return { ok: true };
}
