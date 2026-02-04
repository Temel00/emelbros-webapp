"use client";

import * as React from "react";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /** Where to land after successful sign-in */
  next?: string;
  /** Optional: pass through UI props if you use shadcn/ui variants */
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
};

export function GoogleSignInButton({
  next = "/dashboard",
  size = "sm",
  variant = "default",
  className,
}: Props) {
  const [pending, startTransition] = React.useTransition();

  const handleClick = async () => {
    const supabase = createClient();

    // We'll land on this route after Supabase finishes the OAuth flow.
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next,
    )}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        // These query params encourage Google to return a refresh token
        // (useful if you ever need Google API access). Supabase session
        // refresh is handled automatically, but leaving these helps for Google.
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      // In practice you might replace this with a toast.
      console.error("Google sign-in failed:", error.message);
    }
    // On success, Supabase will redirect away; no further action needed here.
  };

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      disabled={pending}
      onClick={() => startTransition(handleClick)}
    >
      {pending ? "Redirecting…" : "G Sign in"}
    </Button>
  );
}
