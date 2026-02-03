// app/instruments/page.tsx
import { createClient } from "@/lib/supabase/server";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";

async function InstrumentsData() {
  const supabase = await createClient();

  const { data: instruments, error } = await supabase
    .from("instruments")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return <div className="text-red-600">Error: {error.message}</div>;
  }

  if (!instruments || instruments.length === 0) {
    return <div>No instruments found.</div>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
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
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <ul className="list-disc pl-5 space-y-1">
            {instruments.map((i) => (
              <li key={i.id}>
                #{i.id} – {i.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

export default function Instruments() {
  return (
    <Suspense fallback={<div>Loading instruments...</div>}>
      <InstrumentsData />
    </Suspense>
  );
}
