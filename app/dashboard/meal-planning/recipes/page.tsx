import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import {
  RecipeFormToggle,
} from "./widgets";
import type { UUID } from "crypto";
import BreadcrumbNav from "@/components/breadcrumb-nav";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,  
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Recipe = {
  id: UUID;
  name: string;
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
};

async function RecipesList() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("id, name, prep_minutes, cook_minutes, total_minutes")
    .order("name", { ascending: true });

  if (error) return <div className="text-red-600">Error: {error.message}</div>;

  const recipes = (data || []) as Recipe[];

  if (recipes.length === 0) return <div>No recipes found.</div>;

  return (
    <div className="space-y-4">
      <RecipeFormToggle />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.map((recipe) => (
          <Card key={recipe.id} className="flex flex-col">
            <Link href={`/dashboard/meal-planning/recipes/${recipe.id}`}>
              <CardHeader>
                <CardTitle>{recipe.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Badge variant="secondary">Prep: {recipe.prep_minutes}m</Badge>
                <Badge variant="outline">Cook: {recipe.cook_minutes}m</Badge>
                <Badge>Total: {recipe.total_minutes}m</Badge>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function RecipesPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-6xl flex gap-5 justify-between items-center p-3 px-5 text-sm">
            <ThemeSwitcher />
            {!hasEnvVars ? (
              <p>Missing ENV vars</p>
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-6">
          <h1 className="text-2xl font-semibold">Recipes</h1>
          <Suspense fallback={<div>Loading recipes...</div>}>
            <RecipesList />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
