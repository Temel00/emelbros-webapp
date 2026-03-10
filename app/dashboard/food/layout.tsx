import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

export default function FoodLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <Suspense fallback={<div className="h-4" />}>
          <BreadcrumbNav overrides={{ "meal-planning": "meal planning", "shopping-list": "shopping list" }} />
        </Suspense>
        {children}
      </div>
    </main>
  );
}
