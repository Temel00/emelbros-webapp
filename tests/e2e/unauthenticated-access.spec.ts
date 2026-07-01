import { test, expect } from "@playwright/test";

// These flows don't require signing in, so they exercise real
// server-side auth-gating (see lib/supabase/proxy.ts) without needing
// Google OAuth, which can't be driven directly in this test environment.

test("home page prompts an unauthenticated visitor to sign in", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByText("Please sign-in to see your dashboard"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
});

test("visiting /dashboard while unauthenticated redirects home", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL("/");
  await expect(
    page.getByText("Please sign-in to see your dashboard"),
  ).toBeVisible();
});
