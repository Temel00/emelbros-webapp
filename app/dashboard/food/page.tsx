import { Suspense } from "react";
import { fetchFoodSummary } from "./actions";
import { SummaryDashboard } from "./widgets";

async function FoodDashboardContent() {
  const summary = await fetchFoodSummary();
  return <SummaryDashboard summary={summary} />;
}

export default function FoodPage() {
  return (
    <section className="w-full max-w-5xl p-5 space-y-4">
      <h1 className="text-2xl font-semibold">Food</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <FoodDashboardContent />
      </Suspense>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-40 rounded-xl border bg-card/40 animate-pulse"
        />
      ))}
    </div>
  );
}
