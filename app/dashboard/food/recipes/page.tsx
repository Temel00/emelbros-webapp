import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AddRecipeButton, InfiniteRecipesList, RecipeSearchFilter } from "./widgets";
import { fetchRecipes, type Tag } from "./actions";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";

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
    supabase.from("tags").select("id, name, color").order("name"),
    supabase.from("tools").select("id, name").order("name"),
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
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-4">
          <div className="flex justify-between">
            <h1 className="text-2xl font-semibold">Recipes</h1>
            <AddRecipeButton />
          </div>
          <Suspense fallback={<div>Loading recipes...</div>}>
            <RecipesListWithFilters searchParamsPromise={searchParams} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
