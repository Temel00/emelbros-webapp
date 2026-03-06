"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  ok: boolean;
  error?: string;
};

export type MealPlanRecipe = {
  id: string;
  name: string;
  total_minutes: number;
};

export type MealPlan = {
  id: string;
  recipe_id: string;
  scheduled_date: string; // "YYYY-MM-DD"
  cook_time: string | null; // "HH:MM"
  notes: string | null;
  recipe: MealPlanRecipe;
};

export async function fetchMealPlansForMonth(
  year: number,
  month: number,
): Promise<MealPlan[]> {
  const supabase = await createClient();

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("meal_plans")
    .select("id, recipe_id, scheduled_date, cook_time, notes, recipe:recipes(id, name, total_minutes)")
    .gte("scheduled_date", start)
    .lte("scheduled_date", end)
    .order("scheduled_date", { ascending: true })
    .order("cook_time", { ascending: true, nullsFirst: false });

  if (error) return [];
  return (data ?? []) as unknown as MealPlan[];
}

export async function fetchAllRecipes(): Promise<MealPlanRecipe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id, name, total_minutes")
    .order("name", { ascending: true });
  if (error) return [];
  return (data ?? []) as MealPlanRecipe[];
}

export async function addMealPlan(formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  const recipeId = String(formData.get("recipe_id") || "").trim();
  const scheduledDate = String(formData.get("scheduled_date") || "").trim();
  const cookTime = String(formData.get("cook_time") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!recipeId) return { ok: false, error: "A recipe is required" };
  if (!scheduledDate) return { ok: false, error: "A date is required" };

  const { error } = await supabase.from("meal_plans").insert({
    recipe_id: recipeId,
    scheduled_date: scheduledDate,
    cook_time: cookTime,
    notes,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/food/meal-planning");
  return { ok: true };
}

export async function updateMealPlan(formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  const id = String(formData.get("id") || "").trim();
  const recipeId = String(formData.get("recipe_id") || "").trim();
  const scheduledDate = String(formData.get("scheduled_date") || "").trim();
  const cookTime = String(formData.get("cook_time") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!id) return { ok: false, error: "Missing meal plan ID" };
  if (!recipeId) return { ok: false, error: "A recipe is required" };
  if (!scheduledDate) return { ok: false, error: "A date is required" };

  const { error } = await supabase
    .from("meal_plans")
    .update({ recipe_id: recipeId, scheduled_date: scheduledDate, cook_time: cookTime, notes })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/food/meal-planning");
  return { ok: true };
}

export async function deleteMealPlan(id: string): Promise<ActionState> {
  const supabase = await createClient();

  const { error } = await supabase.from("meal_plans").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/food/meal-planning");
  return { ok: true };
}
