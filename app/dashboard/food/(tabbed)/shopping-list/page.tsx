import { Suspense } from "react";
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
    <>
      <h1 className="text-2xl font-semibold">Shopping List</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <ShoppingListData searchParamsPromise={searchParams} />
      </Suspense>
    </>
  );
}
