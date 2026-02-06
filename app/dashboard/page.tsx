import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import BreadcrumbNav from "@/components/breadcrumb-nav";

export default function DashboardPage() {
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
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <Link
            className="bg-terciary rounded-xl p-4 cursor-pointer"
            href={"/dashboard/meal-planning"}
          >
            Meal Planning
          </Link>
        </section>
      </div>
    </main>
  );
}
