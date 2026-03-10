import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserHouseholdId } from "@/lib/supabase/household";
import { BackArrow } from "@/components/ui/back-arrow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/ui/tag-badge";
import type {
  Instruction,
  RecipeIngredient,
  InventoryItem,
  Tool,
} from "./actions";
import type { Recipe } from "../actions";
import { AddToMealPlanButton, EditRecipeButton, RecipeStepsSection } from "./widgets";

async function RecipeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const householdId = await getUserHouseholdId();

  const [
    recipeResult,
    instructionsResult,
    ingredientsResult,
    inventoryResult,
    toolsResult,
    recipeTagsResult,
    allTagsResult,
  ] = await Promise.all([
    supabase.from("recipes").select("*").eq("id", id).single(),
    supabase
      .from("instructions")
      .select(
        "*, instruction_tools(id, tool_id, tool:tools(id, name, location))",
      )
      .eq("recipe_id", id)
      .order("step_number", { ascending: true }),
    supabase
      .from("recipe_ingredients")
      .select("*, inventory(id, name, on_hand_qty, unit)")
      .eq("recipe_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("inventory")
      .select("id, name, unit")
      .eq("household_id", householdId)
      .order("name", { ascending: true }),
    supabase
      .from("tools")
      .select("id, name, location")
      .eq("household_id", householdId)
      .order("name", { ascending: true }),
    supabase
      .from("recipe_tags")
      .select("id, recipe_id, tag_id, tag:tags(id, name, color)")
      .eq("recipe_id", id),
    supabase
      .from("tags")
      .select("id, name, color")
      .eq("household_id", householdId)
      .order("name", { ascending: true }),
  ]);

  if (recipeResult.error || !recipeResult.data) {
    notFound();
  }

  const recipe = recipeResult.data as Recipe;
  const instructions = (instructionsResult.data || []) as Instruction[];
  const ingredients = (ingredientsResult.data || []) as RecipeIngredient[];
  const inventory = (inventoryResult.data || []) as InventoryItem[];
  const tools = (toolsResult.data || []) as Tool[];
  const recipeTags = ((recipeTagsResult.data || []) as unknown as {
    id: string;
    tag_id: string;
    tag: { id: string; name: string; color: string };
  }[]);
  const allTags = (allTagsResult.data || []) as {
    id: string;
    name: string;
    color: string;
  }[];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header with Recipe Name and Edit Button */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
            <Link href="/dashboard/food/recipes">
              <BackArrow className="w-4 h-4 sm:w-5 sm:h-5 hover:text-primary" />
            </Link>
          </Button>
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold flex-shrink-0">
              {recipe.name}
            </h1>
            {recipeTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {recipeTags.map((rt) => (
                  <TagBadge
                    key={rt.id}
                    name={rt.tag.name}
                    color={rt.tag.color}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <AddToMealPlanButton recipeId={recipe.id} recipeName={recipe.name} />
            <EditRecipeButton
              recipe={recipe}
              ingredients={ingredients}
              instructions={instructions}
              inventory={inventory}
              tools={tools}
              tags={allTags}
              recipeTags={recipeTags}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">Prep: {recipe.prep_minutes}m</Badge>
          <Badge variant="outline">Cook: {recipe.cook_minutes}m</Badge>
          <Badge>Total: {recipe.total_minutes}m</Badge>
        </div>
      </div>

      {/* Instructions with inline ingredients */}
      <RecipeStepsSection ingredients={ingredients} instructions={instructions} />
    </div>
  );
}

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div>Loading recipe...</div>}>
      <RecipeDetail params={params} />
    </Suspense>
  );
}
