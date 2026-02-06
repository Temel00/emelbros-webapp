import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import {
  InventoryFormToggle,
  InventorySearchFilter,
  PaginationControls,
  UpdateItemForm,
} from "./widgets";
import { UUID } from "crypto";
import BreadcrumbNav from "@/components/breadcrumb-nav";
import { getUnitsForCategory } from "@/lib/unit-conversions";
import type { UnitCategory } from "@/components/unit-switcher";

const PAGE_SIZE = 15;

type InventoryItem = {
  id: UUID;
  name: string;
  on_hand_qty: number;
  unit: string;
  density: number;
};

type SearchParams = {
  q?: string;
  category?: string;
  page?: string;
};

async function InventoryList({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<SearchParams>;
}) {
  const searchParams = await searchParamsPromise;
  const supabase = await createClient();

  // Parse params with defaults
  const search = searchParams.q ?? "";
  const category = searchParams.category ?? "all";
  const page = Math.max(1, Number(searchParams.page) || 1);

  // Build query with count
  let query = supabase.from("inventory").select("*", { count: "exact" });

  // Apply search filter
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  // Apply category filter
  if (category !== "all") {
    const units = getUnitsForCategory(category as UnitCategory);
    query = query.in("unit", units);
  }

  // Apply pagination
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(from, to);

  if (error) return <div className="text-red-600">Error: {error.message}</div>;

  const items = (data || []) as InventoryItem[];
  const totalItems = count ?? 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <InventoryFormToggle />
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
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id}>
              <UpdateItemForm
                id={item.id}
                currentName={item.name}
                currentQuantity={item.on_hand_qty ?? ""}
                currentUnit={item.unit}
              />
            </div>
          ))}
        </div>
      )}

      <Suspense fallback={null}>
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
        />
      </Suspense>
    </div>
  );
}

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default function InventoryPage({ searchParams }: PageProps) {
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
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <Suspense fallback={<div>Loading inventory…</div>}>
            <InventoryList searchParamsPromise={searchParams} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
