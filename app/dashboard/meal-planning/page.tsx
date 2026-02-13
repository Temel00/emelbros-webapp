import Link from "next/link";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function MealPlanningPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-4">
          <h1 className="text-2xl font-semibold">Meal Planning</h1>
          <div className="flex gap-4">
            <Button asChild variant="default" size="lg">
              <Link href="/dashboard/meal-planning/inventory">Inventory</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/dashboard/meal-planning/recipes">Recipes</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
