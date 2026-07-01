# Server Actions & Data Flow

Every feature route follows the same three-file shape:

```
app/dashboard/<feature>/
├── actions.ts    # "use server" — data fetching + mutations
├── page.tsx      # server component — initial data fetch, layout, Suspense boundaries
└── widgets.tsx   # "use client" — forms, dialogs, interactive state
```

Nested features repeat this at each level (e.g. `app/dashboard/food/(tabbed)/inventory/`), and `[id]/` dynamic routes get their own `actions.ts`/`page.tsx`/`widgets.tsx` triplet (e.g. `app/dashboard/food/(tabbed)/recipes/[id]/`).

## The Supabase client rule

**Never a global/module-level Supabase client.** Every action and every server component data-fetch calls `createClient()` (from [lib/supabase/server.ts](../../lib/supabase/server.ts)) fresh, inside the function. This isn't a style preference — it's required for Fluid Compute, where a module-scoped client would leak across concurrent invocations. You'll see this repeated at the top of nearly every function in every `actions.ts` file; that repetition is intentional, not something to "DRY up" into a shared instance.

## Reading data: page.tsx vs actions.ts

Two patterns coexist, and which one a given feature uses depends on whether it needs pagination/infinite scroll:

- **Simple case** (most features): `page.tsx` queries Supabase directly inside an async server component, passes the result into a client widget as props. See [app/dashboard/health/page.tsx](../../app/dashboard/health/page.tsx) → `getHealthDashboard()`.
- **Infinite-scroll case**: `page.tsx` fetches only the *first page* directly (for fast initial render), and `actions.ts` exports a separate fetch function (e.g. `fetchInventoryItems(loadNumber, search, category, itemsPerLoad)`) that the client widget calls via `useEffect`/IntersectionObserver for subsequent pages. See [app/dashboard/food/(tabbed)/inventory/](../../app/dashboard/food/(tabbed)/inventory/) — note the query-building logic (search/category filters) is duplicated between `page.tsx` and `actions.ts` rather than shared, because the first is a direct server-component query and the second is a callable server action; keep both in sync if you change the filtering logic.

## Mutations: the ActionState pattern

Every mutating action follows:

```typescript
export type ActionState = { ok: boolean; error?: string };

export async function someAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  // validate, mutate
  if (error) {
    if ((error as PostgrestError).code === "23505") return { ok: false, error: "..." };
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/<feature>");
  return { ok: true };
}
```

This signature (`_prevState, formData`) exists specifically to plug into React's `useActionState` from the client widget — the first argument is unused but required by that hook's contract. Some fire-and-forget mutations (e.g. `deleteDartsGame` in [app/dashboard/hobbies/actions.ts](../../app/dashboard/hobbies/actions.ts)) skip the `ActionState` return entirely and return `Promise<void>`, called directly as a form action without `useActionState` — use this simpler shape only when the UI doesn't need to display an error or pending state for that specific action.

**Always `revalidatePath()` after a mutation**, using the full path the data appears on (not a wildcard). Multiple paths get separate calls if a mutation affects more than one route (rare in this codebase currently — most features revalidate exactly one path).

**Ownership checks live in the query, not as a separate check-then-act step**: mutations scope their `.eq("user_id", user.id)` or `.eq("household_id", householdId)` directly on the `update`/`delete` call, so a mismatched ID silently affects zero rows rather than needing a prior existence check. Exceptions exist where the check is a business rule, not just ownership — e.g. `removeMember()` in [app/dashboard/food/household/actions.ts](../../app/dashboard/food/household/actions.ts) explicitly verifies the caller is an `owner` before deleting, since household membership deletion isn't self-scoped the way a personal log entry is.

## Household resolution

Any household-scoped action calls `getUserHouseholdId()` ([lib/supabase/household.ts](../../lib/supabase/household.ts)), which throws if the user has no household — this function is not defensive by design; a user without a household is treated as a bug state (every user gets a solo household on signup), not a case to handle gracefully inline.
