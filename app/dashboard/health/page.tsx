import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";
import { getUserAccessLevel } from "@/lib/supabase/access";
import { hasAccess } from "@/lib/access-level";
import { getHealthDashboard } from "./actions";
import { HealthDashboard } from "./widgets";

async function HealthContent() {
  const accessLevel = await getUserAccessLevel();
  if (!hasAccess(accessLevel, "mt_hood")) redirect("/dashboard");

  const data = await getHealthDashboard();
  return <HealthDashboard data={data} />;
}

export default function HealthPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-4">
          <h1 className="text-2xl font-semibold">Health</h1>
          <Suspense fallback={<div>Loading health data...</div>}>
            <HealthContent />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
