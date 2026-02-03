import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { GoogleSignInButton } from "./google-sign-in";

export async function AuthButton() {
  const supabase = await createClient();  
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {user.email}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <GoogleSignInButton next="/instruments" />
    </div>
  );
}
