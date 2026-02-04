import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { BackArrow } from "@/components/ui/back-arrow";

export default function MealPlanningPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-12 items-center">
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
        <div className="flex w-5/6 py-2">
          <Link
            className="border-3 border-terciary text-foreground rounded-xl p-2 cursor-pointer"
            href={"/dashboard"}
          >
            <BackArrow width="24" height="24" />
          </Link>
        </div>
        <section className="w-full max-w-5xl p-5 space-y-6">
          <h1 className="text-2xl font-semibold">Meal Planning</h1>
          <Link
            className="bg-accent rounded-xl p-4 cursor-pointer"
            href={"/meal-planning/inventory"}
          >
            Inventory
          </Link>
        </section>
      </div>
    </main>
  );
}
