import { Suspense } from "react";
import { FoodTabs } from "@/components/food-tabs";

export default function TabbedFoodLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<div className="h-10" />}>
        <FoodTabs />
      </Suspense>
      <div className="w-full max-w-5xl px-5 -mt-4">
        <section className="w-full border rounded-b-xl rounded-tr-xl bg-card/40 p-5 space-y-4">
          {children}
        </section>
      </div>
    </>
  );
}
