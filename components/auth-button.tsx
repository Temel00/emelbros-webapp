import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { GoogleSignInButton } from "./google-sign-in";

export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-4 text-background dark:text-foreground text-xs">
      <p className="w-12 md:w-36 overflow-hidden text-ellipsis">
        Hey, {user.email}!
      </p>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <GoogleSignInButton next="/dashboard" />
    </div>
  );
}
