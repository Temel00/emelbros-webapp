import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserHouseholdId } from "@/lib/supabase/household";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";
import { VendorsClient } from "./widgets";
import type { Vendor, VendorProductWithInventory } from "./actions";

const ITEMS_PER_LOAD = 15;

type SearchParams = {
  vendor?: string;
  q?: string;
};

async function VendorsContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<SearchParams>;
}) {
  const searchParams = await searchParamsPromise;
  const supabase = await createClient();
  const householdId = await getUserHouseholdId();

  // Fetch all vendors
  const { data: vendorData } = await supabase
    .from("vendors")
    .select("*")
    .eq("household_id", householdId)
    .order("name", { ascending: true });

  const vendors = (vendorData ?? []) as Vendor[];
  const selectedVendorId = searchParams.vendor ?? vendors[0]?.id ?? "";
  const search = searchParams.q ?? "";

  // Fetch vendor products for selected vendor
  let products: VendorProductWithInventory[] = [];
  let totalProducts = 0;
  let hasMore = false;

  if (selectedVendorId) {
    let query = supabase
      .from("vendor_products")
      .select("*, inventory:inventory(id, name, unit)", { count: "exact" })
      .eq("vendor_id", selectedVendorId);

    if (search) {
      query = query.ilike("product_name", `%${search}%`);
    }

    const { data, count } = await query
      .order("created_at", { ascending: false })
      .range(0, ITEMS_PER_LOAD - 1);

    products = (data ?? []) as unknown as VendorProductWithInventory[];
    totalProducts = count ?? 0;
    hasMore = products.length < totalProducts;
  }

  // Fetch inventory items for the product mapping dropdown
  const { data: inventoryData } = await supabase
    .from("inventory")
    .select("id, name, unit")
    .eq("household_id", householdId)
    .order("name", { ascending: true });

  const inventoryItems = (inventoryData ?? []) as {
    id: string;
    name: string;
    unit: string;
  }[];

  return (
    <VendorsClient
      vendors={vendors}
      selectedVendorId={selectedVendorId}
      products={products}
      totalProducts={totalProducts}
      hasMore={hasMore}
      search={search}
      itemsPerLoad={ITEMS_PER_LOAD}
      inventoryItems={inventoryItems}
    />
  );
}

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default function VendorsPage({ searchParams }: PageProps) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-4">
          <h1 className="text-2xl font-semibold">Vendors</h1>
          <Suspense fallback={<div>Loading vendors...</div>}>
            <VendorsContent searchParamsPromise={searchParams} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
