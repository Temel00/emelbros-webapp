import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  AddItemDialog,
  InventorySearchFilter,
  InfiniteInventoryList,
} from "./widgets";
import type { InventoryItem } from "./actions";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";
import { getUnitsForCategory } from "@/lib/unit-conversions";
import type { UnitCategory } from "@/components/unit-switcher";

const ITEMS_PER_LOAD = 15;

type SearchParams = {
  q?: string;
  category?: string;
};

async function InventoryList({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<SearchParams>;
}) {
  const searchParams = await searchParamsPromise;
  const supabase = await createClient();

  const search = searchParams.q ?? "";
  const category = searchParams.category ?? "all";

  // Build query for first page
  let query = supabase.from("inventory").select("*", { count: "exact" });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  if (category !== "all") {
    const units = getUnitsForCategory(category as UnitCategory);
    query = query.in("unit", units);
  }

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(0, ITEMS_PER_LOAD - 1);

  if (error)
    return <div className="text-destructive">Error: {error.message}</div>;

  const items = (data || []) as InventoryItem[];
  const totalItems = count ?? 0;
  const hasMore = items.length < totalItems;

  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="h-10" />}>
        <InventorySearchFilter />
      </Suspense>

      {items.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {search || category !== "all"
            ? "No items match your search criteria."
            : "No inventory found."}
        </div>
      ) : (
        <InfiniteInventoryList
          initialItems={items}
          initialHasMore={hasMore}
          totalItems={totalItems}
          search={search}
          category={category}
          itemsPerLoad={ITEMS_PER_LOAD}
        />
      )}
    </div>
  );
}

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default function InventoryPage({ searchParams }: PageProps) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav />
        <section className="w-6/7 p-5 space-y-4 border border-foreground rounded-lg">
          <Suspense>
            <div className="flex justify-between">
              <h1 className="text-2xl font-semibold">Inventory</h1>
              <AddItemDialog />
            </div>
          </Suspense>
          <Suspense fallback={<div>Loading inventory...</div>}>
            <InventoryList searchParamsPromise={searchParams} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
