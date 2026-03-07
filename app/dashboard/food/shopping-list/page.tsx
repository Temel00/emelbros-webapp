import { Suspense } from "react";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";
import { fetchShoppingList } from "./actions";
import { ShoppingListClient } from "./widgets";

type SearchParams = {
  start?: string;
  end?: string;
};

async function ShoppingListData({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<SearchParams>;
}) {
  const searchParams = await searchParamsPromise;
  const items = await fetchShoppingList();

  // Default date range: today through 7 days from now
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekOut = new Date(now);
  weekOut.setDate(weekOut.getDate() + 7);
  const weekOutStr = weekOut.toISOString().slice(0, 10);

  const defaultStart = searchParams.start ?? todayStr;
  const defaultEnd = searchParams.end ?? weekOutStr;

  return (
    <ShoppingListClient
      items={items}
      defaultStart={defaultStart}
      defaultEnd={defaultEnd}
    />
  );
}

export default function ShoppingListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav overrides={{ "shopping-list": "shopping list" }} />
        <section className="w-full max-w-5xl p-5 space-y-4">
          <h1 className="text-2xl font-semibold">Shopping List</h1>
          <Suspense fallback={<div>Loading...</div>}>
            <ShoppingListData searchParamsPromise={searchParams} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
