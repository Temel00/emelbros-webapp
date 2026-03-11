import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";
import { getUserAccessLevel } from "@/lib/supabase/access";
import { hasAccess } from "@/lib/access-level";
import { getWaterLogs } from "./actions";
import { WaterLogList } from "./widgets";

async function WaterContent() {
  const accessLevel = await getUserAccessLevel();
  if (!hasAccess(accessLevel, "mt_hood")) redirect("/dashboard");

  const logs = await getWaterLogs();
  return <WaterLogList logs={logs} />;
}

export default function WaterPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-4">
          <h1 className="text-2xl font-semibold">Water Intake</h1>
          <Suspense fallback={<div>Loading water logs...</div>}>
            <WaterContent />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
