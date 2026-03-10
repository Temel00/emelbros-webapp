import { Suspense } from "react";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";
import { fetchHouseholdData } from "./actions";
import { HouseholdClient } from "./widgets";

async function HouseholdData() {
  const data = await fetchHouseholdData();

  return (
    <HouseholdClient
      household={data.household}
      members={data.members}
      invites={data.invites}
      currentUserId={data.currentUserId}
    />
  );
}

export default function HouseholdPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-4">
          <h1 className="text-2xl font-semibold">Household</h1>
          <Suspense fallback={<div>Loading household...</div>}>
            <HouseholdData />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
