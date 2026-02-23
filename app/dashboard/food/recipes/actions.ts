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

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type RecipeTag = {
  id: string;
  recipe_id: string;
  tag_id: string;
  tag: Tag;
};

export type RecipeWithTags = Recipe & {
  recipe_tags: { id: string; tag: { id: string; name: string; color: string } }[];
};

export type RecipeFetchResult = {
  recipes: RecipeWithTags[];
  ok: boolean;
  hasMore: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// TAG ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function setRecipeTags(
  recipeId: string,
  tagIds: string[],
): Promise<RecipeActionState> {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("recipe_tags")
    .delete()
    .eq("recipe_id", recipeId);

  if (deleteError) return { ok: false, error: deleteError.message };

  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId) => ({
      recipe_id: recipeId,
      tag_id: tagId,
    }));
    const { error: insertError } = await supabase
      .from("recipe_tags")
      .insert(rows);
    if (insertError) return { ok: false, error: insertError.message };
  }

  revalidatePath("/dashboard/food/recipes");
  revalidatePath(`/dashboard/food/recipes/${recipeId}`);
  return { ok: true };
}

export async function createTagInline(
  name: string,
  color: string = "primary",
): Promise<{ ok: boolean; error?: string; tag?: Tag }> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required" };

  const { data, error } = await supabase
    .from("tags")
    .insert({ name: trimmed, color })
    .select("id, name, color")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Tag already exists" };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, tag: data as Tag };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECIPE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

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

  revalidatePath("/dashboard/food/recipes");
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

  revalidatePath("/dashboard/food/recipes");
  revalidatePath(`/dashboard/food/recipes/${id}`);
  return { ok: true };
}

export async function deleteRecipe(
  _prevState: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  const supabase = await createClient();

  const id = formData.get("id");

  // Delete child rows first (no CASCADE on FKs for some tables)
  const { error: tagsError } = await supabase
    .from("recipe_tags")
    .delete()
    .eq("recipe_id", id);

  if (tagsError) {
    return {
      ok: false,
      error: `Failed to delete tags: ${tagsError.message}`,
    };
  }

  const { error: instrError } = await supabase
    .from("instructions")
    .delete()
    .eq("recipe_id", id);

  if (instrError) {
    return {
      ok: false,
      error: `Failed to delete instructions: ${instrError.message}`,
    };
  }

  const { error: ingredError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", id);

  if (ingredError) {
    return {
      ok: false,
      error: `Failed to delete ingredients: ${ingredError.message}`,
    };
  }

  const { error } = await supabase.from("recipes").delete().eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/food/recipes");
  redirect("/dashboard/food/recipes");
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchRecipes(
  offset: number,
  limit: number,
  search: string,
  tagIds: string[],
  toolIds: string[],
  timeRange: number | null,
): Promise<RecipeFetchResult> {
  const supabase = await createClient();

  try {
    // Early return if no filters and no search
    const hasFilters = tagIds.length > 0 || toolIds.length > 0;

    if (hasFilters) {
      // Use parallel queries for better performance
      const queries = [];

      // Fetch tag-filtered recipe IDs
      if (tagIds.length > 0) {
        queries.push(
          supabase
            .from("recipe_tags")
            .select("recipe_id")
            .in("tag_id", tagIds)
        );
      }

      // Fetch tool-filtered recipe IDs via instructions
      if (toolIds.length > 0) {
        queries.push(
          supabase
            .from("instruction_tools")
            .select("instruction_id")
            .in("tool_id", toolIds)
        );
      }

      const results = await Promise.all(queries);

      let recipeIdsFilter: string[] | null = null;

      // Process tag filter results
      if (tagIds.length > 0) {
        const recipeTags = results[0].data;
        const tagRecipeIds = [...new Set(recipeTags?.map((rt: { recipe_id: string }) => rt.recipe_id) || [])];
        recipeIdsFilter = tagRecipeIds;
      }

      // Process tool filter results
      if (toolIds.length > 0) {
        const instTools = results[tagIds.length > 0 ? 1 : 0].data;
        const instructionIds = [...new Set(instTools?.map((it: { instruction_id: string }) => it.instruction_id) || [])];

        if (instructionIds.length > 0) {
          // Fetch recipe IDs from instructions
          const { data: instructions } = await supabase
            .from("instructions")
            .select("recipe_id")
            .in("id", instructionIds);

          const toolRecipeIds = [...new Set(instructions?.map((i) => i.recipe_id) || [])];

          // Combine with tag filter (AND logic: must satisfy both)
          if (recipeIdsFilter !== null) {
            recipeIdsFilter = recipeIdsFilter.filter((id) => toolRecipeIds.includes(id));
          } else {
            recipeIdsFilter = toolRecipeIds;
          }
        } else {
          // No instructions use these tools
          recipeIdsFilter = [];
        }
      }

      // Early return if no matches
      if (recipeIdsFilter !== null && recipeIdsFilter.length === 0) {
        return { recipes: [], ok: true, hasMore: false };
      }

      // Build final query with all filters
      let query = supabase
        .from("recipes")
        .select(
          "id, name, prep_minutes, cook_minutes, total_minutes, recipe_tags(id, tag:tags(id, name, color))",
        );

      // Apply recipe IDs filter
      if (recipeIdsFilter !== null) {
        query = query.in("id", recipeIdsFilter);
      }

      // Apply search filter
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      // Apply time filter
      if (timeRange !== null) {
        if (timeRange === 999) {
          query = query.gte("total_minutes", 60);
        } else {
          query = query.lt("total_minutes", timeRange);
        }
      }

      // Apply ordering and pagination
      query = query.order("name", { ascending: true }).range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching recipes:", error);
        return { recipes: [], ok: false, hasMore: false };
      }

      const recipes = (data || []) as unknown as RecipeWithTags[];
      const hasMore = recipes.length === limit;

      return { recipes, ok: true, hasMore };
    } else {
      // No tag/tool filters - simple query
      let query = supabase
        .from("recipes")
        .select(
          "id, name, prep_minutes, cook_minutes, total_minutes, recipe_tags(id, tag:tags(id, name, color))",
        );

      // Apply search filter
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      // Apply time filter
      if (timeRange !== null) {
        if (timeRange === 999) {
          query = query.gte("total_minutes", 60);
        } else {
          query = query.lt("total_minutes", timeRange);
        }
      }

      // Apply ordering and pagination
      query = query.order("name", { ascending: true }).range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching recipes:", error);
        return { recipes: [], ok: false, hasMore: false };
      }

      const recipes = (data || []) as unknown as RecipeWithTags[];
      const hasMore = recipes.length === limit;

      return { recipes, ok: true, hasMore };
    }
  } catch (error) {
    console.error("Error in fetchRecipes:", error);
    return { recipes: [], ok: false, hasMore: false };
  }
}
