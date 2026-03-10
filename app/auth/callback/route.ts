import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * This route finalizes the OAuth flow by exchanging the `code` for a session,
 * setting the auth cookies, then redirecting the user where they need to go.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  // We'll mutate this response after we set cookies.
  let response = NextResponse.redirect(new URL(next, url.origin));

  // Create a server client that can read *and write* cookies on the response,
  // mirroring your `proxy.ts` pattern to avoid session desync.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Recreate a redirect response so we can attach the new cookies to it.
          response = NextResponse.redirect(new URL(next, url.origin));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Redirect to an error screen you control
      return NextResponse.redirect(
        new URL(
          `/auth/error?message=${encodeURIComponent(error.message)}`,
          url.origin,
        ),
      );
    }

    // Auto-provision household for new users
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Upsert profile with latest user info
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email ?? "",
          display_name: user.user_metadata?.full_name ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
        },
        { onConflict: "id" },
      );

      const { data: membership } = await supabase
        .from("household_members")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!membership) {
        // Check for a pending invite for this user's email
        const { data: invite } = await supabase
          .from("household_invites")
          .select("id, household_id")
          .eq("invited_email", user.email)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();

        if (invite) {
          // Accept the invite: join the existing household
          await supabase.from("household_members").insert({
            household_id: invite.household_id,
            user_id: user.id,
            role: "member",
          });
          await supabase
            .from("household_invites")
            .update({ status: "accepted" })
            .eq("id", invite.id);
        } else {
          // No invite — create a solo household
          const displayName =
            user.user_metadata?.full_name ??
            user.email?.split("@")[0] ??
            "My";
          const { data: household } = await supabase
            .from("households")
            .insert({ name: `${displayName}'s Household`, created_by: user.id })
            .select("id")
            .single();

          if (household) {
            await supabase.from("household_members").insert({
              household_id: household.id,
              user_id: user.id,
              role: "owner",
            });
          }
        }
      }
    }
  }

  return response;
}
