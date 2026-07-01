# Auth & Access

Two separate systems are easy to conflate here: **authentication** (are you logged in at all) and **access level** (which dashboard sections you can see once logged in). This doc covers both.

## Authentication flow

1. Google Sign-In ([components/google-sign-in.tsx](../../components/google-sign-in.tsx)) kicks off Supabase OAuth.
2. [app/auth/callback/route.ts](../../app/auth/callback/route.ts) handles the OAuth redirect and exchanges the code for a session.
3. Every request runs through [proxy.ts](../../proxy.ts) → [lib/supabase/proxy.ts](../../lib/supabase/proxy.ts)'s `updateSession()`, which:
   - Creates a fresh Supabase server client scoped to the request (never a global client — see [server-actions-and-data-flow.md](server-actions-and-data-flow.md) for why).
   - Calls `supabase.auth.getClaims()` to validate the session.
   - Redirects unauthenticated requests to `/` unless the path is `/`, `/login`, or starts with `/auth`.

**Hard rule, called out in the code comments and CLAUDE.md**: never insert logic between `createServerClient(...)` and `supabase.auth.getClaims()` in `updateSession()`. Doing so has previously caused random logouts — the call order matters for cookie refresh timing, not just readability.

`proxy.ts` matches all routes except `_next/static`, `_next/image`, `favicon.ico`, and common image extensions (see the `config.matcher` regex) — if you add a new static-asset-like route that should skip auth, extend that matcher rather than adding a bypass inside `updateSession()`.

## Access level system

Independent from auth — a logged-in user can still be denied a *section* based on `profiles.access_level`. Defined in [lib/access-level.ts](../../lib/access-level.ts):

| Level | Rank (lower = more access) | Label |
|---|---|---|
| `mt_hood` | 0 | Mt. Hood |
| `mt_jeff` | 1 | Mt. Jeff |
| `sisters` | 2 | Sisters |

`hasAccess(userLevel, requiredLevel)` returns true when the user's rank is numerically ≤ the required rank — i.e., access is monotonic: `mt_hood` can see everything `mt_jeff` and `sisters` can. There is no level between sections that only `mt_jeff` can see and nothing else does yet — as of this writing, every gated section requires `mt_hood`, and `sisters` is the default/lowest tier new profiles get (`profiles.access_level` defaults to `'sisters'` in the DB).

`getUserAccessLevel()` ([lib/supabase/access.ts](../../lib/supabase/access.ts)) reads `profiles.access_level` for the current user, defaulting to `"sisters"` if no profile row exists (not `null` — this means an unrecognized/missing profile is treated as lowest access, not no access, since auth already gated that far).

### The guard pattern

Every access-gated page follows this shape (see [app/dashboard/health/page.tsx](../../app/dashboard/health/page.tsx) or [app/dashboard/monthly/page.tsx](../../app/dashboard/monthly/page.tsx)):

```tsx
async function ProtectedContent() {
  const accessLevel = await getUserAccessLevel();
  if (!hasAccess(accessLevel, "mt_hood")) redirect("/dashboard");
  // fetch + render
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProtectedContent />
    </Suspense>
  );
}
```

The check lives *inside* the async component wrapped by `Suspense`, not in the outer page function — this lets the page shell (header, breadcrumb) render immediately while the access check + redirect happens as part of the streamed content.

**Known gap:** the top-level dashboard card grid ([app/dashboard/page.tsx](../../app/dashboard/page.tsx) `SECTIONS` array) currently only lists Food, Health, and Hobbies — the Monthly section (`/dashboard/monthly`, `mt_hood`-gated) has a working guard but no entry in `SECTIONS`, so it's reachable only by direct URL, not via the dashboard grid. If you're closing this gap, add a `Monthly` entry to `SECTIONS` with `requiredLevel: "mt_hood"`.
