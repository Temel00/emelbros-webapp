import Link from "next/link";
import BreadcrumbNav from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";

export default function MealPlanningPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-4">
          <h1 className="text-2xl font-semibold">Meal Planning</h1>
          <div className="flex gap-4">
            <Link
              className="bg-accent rounded-xl p-4 cursor-pointer"
              href={"/dashboard/meal-planning/inventory"}
            >
              Inventory
            </Link>
            <Link
              className="bg-secondary rounded-xl p-4 cursor-pointer"
              href={"/dashboard/meal-planning/recipes"}
            >
              Recipes
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
