import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TOKEN_URL = "https://api.kroger.com/v1/connect/oauth2/token";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const listUrl = `${appUrl}/dashboard/food/shopping-list`;

  const cookieStore = await cookies();
  const storedState = cookieStore.get("kroger_oauth_state")?.value;
  cookieStore.delete("kroger_oauth_state");

  if (error) {
    return NextResponse.redirect(
      `${listUrl}?kroger_error=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(`${listUrl}?kroger_error=invalid_state`);
  }

  const clientId = process.env.KROGER_CLIENT_ID!;
  const clientSecret = process.env.KROGER_CLIENT_SECRET!;
  const redirectUri = `${appUrl}/api/kroger/callback`;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("Kroger token exchange failed:", errText);
    return NextResponse.redirect(`${listUrl}?kroger_error=token_failed`);
  }

  const tokens = await tokenRes.json();

  const response = NextResponse.redirect(`${listUrl}?kroger_connected=true`);

  response.cookies.set("kroger_access_token", tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: tokens.expires_in ?? 1800,
    path: "/",
  });

  if (tokens.refresh_token) {
    response.cookies.set("kroger_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 180, // 6 months
      path: "/",
    });
  }

  return response;
}
