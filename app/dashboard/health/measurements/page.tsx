import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { PageHeader } from "@/components/page-header";
import { getUserAccessLevel } from "@/lib/supabase/access";
import { hasAccess } from "@/lib/access-level";
import { getMeasurements, getHealthProfile } from "./actions";
import { MeasurementList } from "./widgets";

async function MeasurementContent() {
  const accessLevel = await getUserAccessLevel();
  if (!hasAccess(accessLevel, "mt_hood")) redirect("/dashboard");

  const [measurements, profile] = await Promise.all([
    getMeasurements(),
    getHealthProfile(),
  ]);
  return <MeasurementList measurements={measurements} profile={profile} />;
}

export default function MeasurementsPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-4">
          <h1 className="text-2xl font-semibold">Measurements</h1>
          <Suspense fallback={<div>Loading measurements...</div>}>
            <MeasurementContent />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
