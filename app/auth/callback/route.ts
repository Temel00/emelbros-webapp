import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * This route finalizes the OAuth flow by exchanging the `code` for a session,
 * setting the auth cookies, then redirecting the user where they need to go.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/instruments";

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
  }

  return response;
}
