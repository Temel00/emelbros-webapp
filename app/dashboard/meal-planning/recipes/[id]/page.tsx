import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BreadcrumbNav from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";
import type { UUID } from "crypto";
import {
  UpdateRecipeForm,
  EditModeToggle,
  IngredientsSection,
  InstructionsSection,
  DeleteRecipeForm,
} from "./widgets";

export type Recipe = {
  id: UUID;
  name: string;
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
};

export type Instruction = {
  id: UUID;
  step_number: number;
  text: string;
  detail: string | null;
};

export type RecipeIngredient = {
  id: UUID;
  amount: number | null;
  unit: string | null;
  first_used_step: number | null;
  used_in_steps: number[];
  note: string | null;
  position: number | null;
  inventory: {
    id: UUID;
    name: string;
    on_hand_qty: number;
    unit: string | null;
  };
};

export type InventoryItem = {
  id: UUID;
  name: string;
  unit: string | null;
};

async function RecipeDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const editMode = edit === "1";

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
    <div className="space-y-8">
      {/* Header with Edit Mode Toggle */}
      <div className="flex justify-between items-start">
        <UpdateRecipeForm
          id={recipe.id}
          currentName={recipe.name}
          currentPrepMinutes={recipe.prep_minutes}
          currentCookMinutes={recipe.cook_minutes}
        />
        <EditModeToggle editMode={editMode} />
      </div>

      {/* Ingredients */}
      <IngredientsSection
        recipeId={recipe.id}
        ingredients={ingredients}
        inventory={inventory}
        editMode={editMode}
      />

      {/* Instructions */}
      <InstructionsSection
        recipeId={recipe.id}
        instructions={instructions}
        editMode={editMode}
      />

      {/* Delete Recipe (only in edit mode) */}
      {editMode && (
        <DeleteRecipeForm id={recipe.id} recipeName={recipe.name} />
      )}
    </div>
  );
}

export default function RecipeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <Suspense>
          <BreadcrumbNav />
        </Suspense>
        <section className="w-full max-w-5xl p-5 space-y-4">
          <Suspense fallback={<div>Loading recipe...</div>}>
            <RecipeDetail params={params} searchParams={searchParams} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
