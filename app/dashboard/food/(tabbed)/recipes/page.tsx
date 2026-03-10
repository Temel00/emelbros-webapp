import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserHouseholdId } from "@/lib/supabase/household";
import { AddRecipeButton, InfiniteRecipesList, RecipeSearchFilter } from "./widgets";
import { fetchRecipes, type Tag } from "./actions";

type SearchParams = {
  q?: string;
  tags?: string;
  tools?: string;
  time?: string;
};

type Tool = {
  id: string;
  name: string;
};

async function RecipesListWithFilters({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<SearchParams>;
}) {
  const searchParams = await searchParamsPromise;
  const supabase = await createClient();
  const householdId = await getUserHouseholdId();

  // Parse URL params
  const search = searchParams.q ?? "";
  const tagIds = searchParams.tags
    ? searchParams.tags.split(",").filter((id) => id.length > 0)
    : [];
  const toolIds = searchParams.tools
    ? searchParams.tools.split(",").filter((id) => id.length > 0)
    : [];
  const timeRange = searchParams.time ? Number(searchParams.time) : null;

  // Fetch filter options and recipes in parallel
  const [tagsResult, toolsResult, recipesResult] = await Promise.all([
    supabase.from("tags").select("id, name, color").eq("household_id", householdId).order("name"),
    supabase.from("tools").select("id, name").eq("household_id", householdId).order("name"),
    fetchRecipes(0, 15, search, tagIds, toolIds, timeRange),
  ]);

  const allTags = (tagsResult.data || []) as Tag[];
  const allTools = (toolsResult.data || []) as Tool[];
  const { recipes, ok, hasMore } = recipesResult;

  if (!ok) {
    return <div className="text-destructive">Error loading recipes</div>;
  }

  return (
    <>
      <RecipeSearchFilter allTags={allTags} allTools={allTools} />
      <InfiniteRecipesList
        initialRecipes={recipes}
        initialHasMore={hasMore}
        search={search}
        tagIds={tagIds}
        toolIds={toolIds}
        timeRange={timeRange}
        allTags={allTags}
        allTools={allTools}
      />
    </>
  );
}

export default function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <>
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold">Recipes</h1>
        <AddRecipeButton />
      </div>
      <Suspense fallback={<div>Loading recipes...</div>}>
        <RecipesListWithFilters searchParamsPromise={searchParams} />
      </Suspense>
    </>
  );
}
