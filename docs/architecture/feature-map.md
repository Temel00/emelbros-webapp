# Feature Map

One paragraph per dashboard section, so you can find the right route without reading the whole tree. See [auth-and-access.md](auth-and-access.md) for what each `requiredLevel` means.

## Food — `/dashboard/food` (requires `sisters`, i.e. everyone)

Household-scoped. Sits under a tabbed layout ([app/dashboard/food/(tabbed)/layout.tsx](../../app/dashboard/food/(tabbed)/layout.tsx)) covering **Inventory** (on-hand items, infinite-scroll list), **Recipes** (list + `[id]` detail page with step-by-step instructions and tool/ingredient callouts), **Meal Planning** (recipes scheduled to dates), and **Shopping List** (generated from low/out-of-stock inventory, purchasable checklist). Outside the tabbed layout: **Tools** (kitchen equipment, referenced by recipe instructions), **Vendors** (stores + UPC-linked products, integrates with the Kroger API under `app/api/kroger/` for cart push), and **Household** (member/invite management — the only place household membership itself is edited).

## Health — `/dashboard/health` (requires `mt_hood`)

User-scoped (private per person, not shared with household). Three independent logs: **Water** (`water_logs`, quick-add from the dashboard widget), **Exercises** (`exercises`, sets/reps/weight/duration), **Measurements** (`measurements`, weight + blood pressure, with BMI computed client-side from `profiles.height_in`). The section landing page ([app/dashboard/health/page.tsx](../../app/dashboard/health/page.tsx)) aggregates a dashboard summary; each sub-route has its own full history view.

## Hobbies — `/dashboard/hobbies` (requires `mt_hood`)

User-scoped. Currently backs **Darts** (`darts_games` — win/loss log with win % summary). The UI also references a "Disc Duels" hobby with no backing table yet — an unimplemented stub, not a bug.

## Monthly — `/dashboard/monthly` (requires `mt_hood`)

User-scoped. Tracks **Financial Accounts** (checking/savings) and **Credit Accounts** (card balances, statement balance, payment due date), plus a **Monthly Review** flow that snapshots all account balances into `monthly_net_worth_snapshots` for historical net-worth tracking. See [data-model.md](data-model.md) for why snapshots duplicate account data instead of joining live. **Not yet linked from the dashboard's card grid** — reachable only by direct URL (see the known gap in [auth-and-access.md](auth-and-access.md)).

## Cross-cutting: Kroger integration — `app/api/kroger/`

Not a dashboard section itself — three route handlers (`auth`, `callback`, `cart`) that let the Vendors feature push a Shopping List to a real Kroger cart via OAuth + the Kroger Products/Cart API. Credentials come from `KROGER_CLIENT_ID`/`KROGER_CLIENT_SECRET` env vars.

## Dashboard shell — `/dashboard`

The landing page ([app/dashboard/page.tsx](../../app/dashboard/page.tsx)) renders the `SECTIONS` card grid (Food/Health/Hobbies today) gated per-card by access level, plus a `Toolbox` widget for `mt_hood` users. This is the file to edit when adding a new top-level section or fixing the Monthly nav gap.
