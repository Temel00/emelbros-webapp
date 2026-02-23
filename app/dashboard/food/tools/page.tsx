import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  AddToolDialog,
  ToolsSearchFilter,
  InfiniteToolsList,
} from "./widgets";
import type { Tool } from "./actions";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";

const ITEMS_PER_LOAD = 15;

type SearchParams = {
  q?: string;
};

async function ToolsList({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<SearchParams>;
}) {
  const searchParams = await searchParamsPromise;
  const supabase = await createClient();

  const search = searchParams.q ?? "";

  let query = supabase.from("tools").select("*", { count: "exact" });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(0, ITEMS_PER_LOAD - 1);

  if (error)
    return <div className="text-destructive">Error: {error.message}</div>;

  const items = (data || []) as Tool[];
  const totalItems = count ?? 0;
  const hasMore = items.length < totalItems;

  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="h-10" />}>
        <ToolsSearchFilter />
      </Suspense>

      {items.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {search ? "No tools match your search." : "No tools found."}
        </div>
      ) : (
        <InfiniteToolsList
          initialItems={items}
          initialHasMore={hasMore}
          totalItems={totalItems}
          search={search}
          itemsPerLoad={ITEMS_PER_LOAD}
        />
      )}
    </div>
  );
}

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default function ToolsPage({ searchParams }: PageProps) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-4">
          <Suspense fallback={<div className="h-10" />}>
            <div className="flex justify-between">
              <h1 className="text-2xl font-semibold">Tools</h1>
              <AddToolDialog />
            </div>
          </Suspense>
          <Suspense fallback={<div>Loading tools...</div>}>
            <ToolsList searchParamsPromise={searchParams} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
