import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";
import { BackArrow } from "@/components/ui/back-arrow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  Instruction,
  RecipeIngredient,
  InventoryItem,
} from "./actions";
import type { Recipe } from "../actions";
import {
  EditRecipeButton,
  IngredientsSection,
  InstructionsSection,
} from "./widgets";

async function RecipeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();

  const [recipeResult, instructionsResult, ingredientsResult, inventoryResult] =
    await Promise.all([
      supabase.from("recipes").select("*").eq("id", id).single(),
      supabase
        .from("instructions")
        .select("*")
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
        .order("name", { ascending: true }),
    ]);

  if (recipeResult.error || !recipeResult.data) {
    notFound();
  }

  const recipe = recipeResult.data as Recipe;
  const instructions = (instructionsResult.data || []) as Instruction[];
  const ingredients = (ingredientsResult.data || []) as RecipeIngredient[];
  const inventory = (inventoryResult.data || []) as InventoryItem[];

  return (
    <div className="space-y-6 sm:space-y-8">
      <BreadcrumbNav overrides={{ [id]: recipe.name }} />

      {/* Header with Recipe Name and Edit Button */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
            <Link href="/dashboard/food/recipes">
              <BackArrow className="w-4 h-4 sm:w-5 sm:h-5 hover:text-primary" />
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl font-semibold flex-1 min-w-0">
            {recipe.name}
          </h1>
          <EditRecipeButton
            recipe={recipe}
            ingredients={ingredients}
            instructions={instructions}
            inventory={inventory}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">Prep: {recipe.prep_minutes}m</Badge>
          <Badge variant="outline">Cook: {recipe.cook_minutes}m</Badge>
          <Badge>Total: {recipe.total_minutes}m</Badge>
        </div>
      </div>

      {/* Ingredients */}
      <IngredientsSection ingredients={ingredients} />

      {/* Instructions */}
      <InstructionsSection instructions={instructions} />
    </div>
  );
}

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <section className="w-full max-w-5xl px-3 sm:px-5 py-4 sm:py-5 space-y-4">
          <Suspense fallback={<div>Loading recipe...</div>}>
            <RecipeDetail params={params} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
