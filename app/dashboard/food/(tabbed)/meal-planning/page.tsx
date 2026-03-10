import { Suspense } from "react";
import { MealPlanningCalendar } from "./widgets";
import { fetchMealPlansForMonth, fetchAllRecipes } from "./actions";

type SearchParams = {
  year?: string;
  month?: string;
};

async function CalendarWithData({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<SearchParams>;
}) {
  const searchParams = await searchParamsPromise;

  const now = new Date();
  const year = searchParams.year ? parseInt(searchParams.year, 10) : now.getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month, 10) : now.getMonth() + 1;

  const [mealPlans, recipes] = await Promise.all([
    fetchMealPlansForMonth(year, month),
    fetchAllRecipes(),
  ]);

  return (
    <MealPlanningCalendar
      initialMealPlans={mealPlans}
      recipes={recipes}
      year={year}
      month={month}
    />
  );
}

export default function MealPlanningPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <>
      <h1 className="text-2xl font-semibold">Meal Planning</h1>
      <Suspense fallback={<div>Loading calendar...</div>}>
        <CalendarWithData searchParamsPromise={searchParams} />
      </Suspense>
    </>
  );
}
