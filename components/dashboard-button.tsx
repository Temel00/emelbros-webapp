import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";

async function DashboardButtonData() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  return user ? (
    <div className="flex flex-col items-center gap-4">
      <h3>You are signed in as: {user.email}!</h3>
      <Link
        className="bg-secondary rounded-xl p-4 cursor-pointer"
        href={"/dashboard"}
      >
        Go to Dashboard
      </Link>
    </div>
  ) : (
    <div className="flex gap-2">
      <h3>Sign in to interact</h3>
    </div>
  );
}

export function DashboardButton() {
  return (
    <Suspense>
      <DashboardButtonData />
    </Suspense>
  );
}
