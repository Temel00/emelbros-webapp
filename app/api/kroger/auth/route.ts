import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const KROGER_AUTH_URL =
  "https://api.kroger.com/v1/connect/oauth2/authorize";

export async function GET() {
  const clientId = process.env.KROGER_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Kroger API not configured" },
      { status: 500 },
    );
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("kroger_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/kroger/callback`;

  const params = new URLSearchParams({
    scope: "cart.basic:write",
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(`${KROGER_AUTH_URL}?${params}`);
}
