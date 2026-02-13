"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UUID } from "crypto";

export type RecipeActionState = {
  ok: boolean;
  error?: string;
};

export type Recipe = {
  id: UUID;
  name: string;
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
};

export async function addRecipe(
  _prevState: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const prepMinutes = Number(formData.get("prep_minutes"));
  const cookMinutes = Number(formData.get("cook_minutes"));

  if (!name) {
    return { ok: false, error: "Name is required" };
  }
  if (Number.isNaN(prepMinutes) || prepMinutes < 0) {
    return { ok: false, error: "Prep minutes must be a non-negative number" };
  }
  if (Number.isNaN(cookMinutes) || cookMinutes < 0) {
    return { ok: false, error: "Cook minutes must be a non-negative number" };
  }

  const { error } = await supabase.from("recipes").insert([
    {
      name,
      prep_minutes: prepMinutes,
      cook_minutes: cookMinutes,
    } satisfies Partial<Recipe>,
  ]);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/meal-planning/recipes");
  return { ok: true };
}

export async function updateRecipe(
  _prevState: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  const supabase = await createClient();

  const id = formData.get("id");

  const next: Partial<Recipe> = {};

  if (formData.has("name")) {
    next.name = String(formData.get("name") || "").trim();
    if (!next.name) return { ok: false, error: "Name cannot be empty" };
  }
  if (formData.has("prep_minutes")) {
    const v = Number(formData.get("prep_minutes"));
    if (Number.isNaN(v) || v < 0) {
      return { ok: false, error: "Prep minutes must be a non-negative number" };
    }
    next.prep_minutes = v;
  }
  if (formData.has("cook_minutes")) {
    const v = Number(formData.get("cook_minutes"));
    if (Number.isNaN(v) || v < 0) {
      return { ok: false, error: "Cook minutes must be a non-negative number" };
    }
    next.cook_minutes = v;
  }

  if (Object.keys(next).length === 0) {
    return { ok: false, error: "No fields to update" };
  }

  const { error } = await supabase.from("recipes").update(next).eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/meal-planning/recipes");
  revalidatePath(`/dashboard/meal-planning/recipes/${id}`);
  return { ok: true };
}

export async function deleteRecipe(
  _prevState: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  const supabase = await createClient();

  const id = formData.get("id");

  // Delete child rows first (no CASCADE on FKs)
  const { error: instrError } = await supabase
    .from("instructions")
    .delete()
    .eq("recipe_id", id);

  if (instrError) {
    return { ok: false, error: `Failed to delete instructions: ${instrError.message}` };
  }

  const { error: ingredError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", id);

  if (ingredError) {
    return { ok: false, error: `Failed to delete ingredients: ${ingredError.message}` };
  }

  const { error } = await supabase.from("recipes").delete().eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/meal-planning/recipes");
  redirect("/dashboard/meal-planning/recipes");
}
