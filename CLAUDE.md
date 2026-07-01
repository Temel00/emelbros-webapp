# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Start here, then branch out:** [CONTEXT.md](CONTEXT.md) has the domain glossary and links to deep-dive docs in `docs/architecture/` — read the one relevant to what you're touching rather than assuming this file covers it. If you're an autonomous agent picking up a GitHub issue, read [AGENTS.md](AGENTS.md) first for the workflow (worktrees, labels, exit criteria, PRs).

## Project Overview

Personal life management application built with Next.js 15+ (App Router), TypeScript, Supabase, and Tailwind CSS. Covers food management (inventory, recipes, meal planning, shopping lists), health tracking, hobbies, and monthly financial review — see [docs/architecture/feature-map.md](docs/architecture/feature-map.md) for the full breakdown.

## Common Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000

# Building
npm run build        # Create production build

# Production
npm run start        # Run production build

# Linting
npm run lint         # Run ESLint on codebase
```

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript (strict mode enabled)
- **Database/Auth**: Supabase (with SSR package @supabase/ssr)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (new-york style) with Radix UI primitives
- **Theming**: next-themes (supports system/light/dark modes)
- **Icons**: Lucide React
- **Drag & Drop**: @dnd-kit/core and @dnd-kit/sortable
- **Utilities**: class-variance-authority (cva), clsx, tailwind-merge

## Architecture

Full write-ups live in `docs/architecture/` — this section is just pointers plus the one rule that's critical enough to repeat everywhere.

### Supabase Client Pattern

**CRITICAL**: Never create Supabase clients as global variables. Always create new clients within each function to support Fluid compute.

- **Server Components/Actions**: Use `createClient()` from [lib/supabase/server.ts](lib/supabase/server.ts)
- **Client Components**: Use `createClient()` from [lib/supabase/client.ts](lib/supabase/client.ts)
- **Route Handlers**: Use inline `createServerClient()` with cookie management (see [app/auth/callback/route.ts](app/auth/callback/route.ts))

### Where to read more

- **Auth flow, session proxy, access-level gating** → [docs/architecture/auth-and-access.md](docs/architecture/auth-and-access.md)
- **actions.ts/page.tsx/widgets.tsx pattern, revalidation, ActionState** → [docs/architecture/server-actions-and-data-flow.md](docs/architecture/server-actions-and-data-flow.md)
- **Database schema, household-scoped vs user-scoped tables** → [docs/architecture/data-model.md](docs/architecture/data-model.md)
- **Weight/volume/count conversion, density** → [docs/architecture/unit-conversion-system.md](docs/architecture/unit-conversion-system.md)
- **What each dashboard section does, which route owns what** → [docs/architecture/feature-map.md](docs/architecture/feature-map.md)

### Path Aliases

- `@/*` maps to root directory
- shadcn/ui aliases:
  - `@/components` → components directory
  - `@/components/ui` → UI components
  - `@/lib/utils` → utility functions
  - `@/lib` → lib directory
  - `@/hooks` → hooks directory (when created)

### Component Organization

- **UI Components**: [components/ui/](components/ui/) - shadcn/ui components (button, card, badge, dropdown-menu, etc.)
- **Feature Components**: [components/](components/) - auth-button, google-sign-in, theme-switcher, unit-switcher, breadcrumb-nav, etc.
- **Styling**: [cn()](lib/utils.ts#L4) utility combines clsx and tailwind-merge for conditional classes

**File Organization Pattern**: Each feature route follows `page.tsx` (server component, data fetching) + `widgets.tsx` (client components) + `actions.ts` (server actions) — see [docs/architecture/server-actions-and-data-flow.md](docs/architecture/server-actions-and-data-flow.md) for the full pattern.

## Coding Style Guide

This section defines coding patterns and conventions used throughout the application. **Always follow these patterns when creating or modifying code.**

### Color System & Theme Usage

**CRITICAL**: Never use hardcoded color classes like `text-red-600`, `bg-blue-500`, etc. Always use semantic theme colors.

**Semantic Color Palette:**

| Purpose | Theme Color | Tailwind Classes | Usage Examples |
|---------|-------------|------------------|----------------|
| **Errors/Destructive** | `destructive` (red) | `text-destructive`<br>`bg-destructive`<br>`bg-destructive/10` | Error messages, delete buttons, negative states, insufficient inventory |
| **Success/Positive** | `tertiary` (teal) | `text-tertiary`<br>`bg-tertiary` | Success messages, positive states, sufficient inventory (>50%) |
| **Warnings/Alerts** | `secondary` (yellow) | `text-secondary`<br>`bg-secondary`<br>`bg-secondary/20` | Warning states, low inventory (<50%), highlights |
| **Primary Actions** | `primary` (pink) | `bg-primary`<br>`text-primary`<br>`text-primary-foreground` | Main buttons, CTAs, active states, step numbers |
| **Accent** | `accent` (blue) | `bg-accent`<br>`bg-accent/10`<br>`bg-accent/20` | Table headers, secondary highlights, navigation |
| **Muted/Secondary** | `muted-foreground` | `text-muted-foreground` | Labels, secondary text, placeholders, icon labels |
| **Header** | `header` (dark navy) | `bg-header` | Top navigation bar background |

**Examples:**

```tsx
// ❌ Bad - Hardcoded colors
<p className="text-red-600">{error}</p>
<div className="bg-green-500">Success!</div>

// ✅ Good - Semantic theme colors
<p className="text-destructive">{error}</p>
<div className="bg-tertiary">Success!</div>
```

### Component Usage

**Always use shadcn/ui components** - never create custom styled native HTML elements:

```tsx
// ❌ Bad - Native HTML with custom styles
<input className="border px-2 py-1 h-10 rounded" />
<button className="border px-3 py-1 rounded">Click</button>

// ✅ Good - shadcn components
<Input />
<Button>Click</Button>
```

**When to override component className:**
Only add className props for layout and size, never for base styling:
- **Layout**: `w-24`, `mx-8`, `self-center`, `md:w-full`
- **Responsive sizing**: `w-3 md:w-4`, `text-xs md:text-sm`
- **Typography size**: `text-xl` (sparingly)
- **Never override**: borders, padding, rounded corners, colors

### Mobile-First Responsive Design

**Always design for mobile first, then enhance for larger screens:**

```tsx
// ✅ Good - Mobile-first icon sizing
<Icon className="w-3 md:w-4" />

// ✅ Good - Responsive text
<p className="text-xs md:text-sm">Label</p>

// ✅ Good - Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

**Common responsive patterns:**
- Icons: `w-3 md:w-4` or `w-4 md:w-5`
- Text: `text-xs md:text-sm` or `text-sm md:text-base`
- Grids: Start with `grid-cols-1`, add `sm:grid-cols-2`, then `lg:grid-cols-3`
- Spacing: Use consistent values (`gap-4`, `space-y-4`, `p-5`)

### Form Field Patterns

```tsx
// ✅ Good - Form field with label
<div className="space-y-2">
  <label htmlFor="name" className="text-sm font-medium">
    Name
  </label>
  <Input id="name" name="name" required />
</div>

// ✅ Good - Form field group with multiple inputs
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-2">
    <label htmlFor="quantity" className="text-sm font-medium">
      Quantity
    </label>
    <Input
      id="quantity"
      name="quantity"
      type="number"
      step="0.1"
      min="0"
      placeholder="0.0"
    />
  </div>
  <div className="space-y-2">
    <label className="text-sm font-medium">Unit</label>
    <UnitSwitcher currentVal="g" name="unit" />
  </div>
</div>

// ✅ Good - Form with consistent spacing
<form action={formAction} className="space-y-4">
  {/* Form fields */}
</form>
```

**Form field guidelines:**
- Use `space-y-2` for label + input grouping
- Use `space-y-4` for spacing between field groups
- Labels: `text-sm font-medium`
- Always include `htmlFor` on labels matching input `id`
- Use `required` attribute for required fields
- Provide placeholders for clarity ("0.0", "Enter name...", etc.)

### Transition & Animation Patterns

Add smooth transitions for interactive elements:

```tsx
// ✅ Good - Button with transition
<button className="... transition-colors">

// ✅ Good - Icon with spin animation
<Loader className="w-4 h-4 animate-spin" />

// ✅ Good - Hover with opacity transition
<div className="hover:bg-accent/10 transition-colors">

// ✅ Good - Focus states with ring transition
<Input className="focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow]" />
```

**Transition patterns:**
- Use `transition-colors` for color changes (most common)
- Use `transition-[color,box-shadow]` for inputs (focus states)
- Use `animate-spin` for loading spinners
- Keep transitions subtle and fast (default timing is ideal)

### UI Pattern Library

**Consistent component patterns used throughout the application:**

#### Tooltip Integration

Always wrap icon buttons with tooltips for better UX:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ✅ Good - Icon button with tooltip
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <Trash2 className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Delete item</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

#### Dialog Forms with Server Actions

Use Dialog components for create/update forms with useActionState:

```tsx
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActionState, useEffect } from "react";
import { addItem, type ActionState } from "./actions";

const initialState: ActionState = { ok: true };

function AddItemDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addItem, initialState);

  // Close dialog on success
  useEffect(() => {
    if (state.ok && !pending) {
      setOpen(false);
    }
  }, [state.ok, pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>Fill out the form below</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <Input id="name" name="name" required />
          </div>

          {!state.ok && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Key form patterns:**
- Use `useActionState` for server action integration
- Define `initialState` at top of file: `const initialState: ActionState = { ok: true };`
- Close dialog on success using `useEffect` watching `state.ok && !pending`
- Show loading state in submit button with disabled + Loader icon
- Display errors conditionally: `{!state.ok && <p className="text-sm text-destructive">{state.error}</p>}`
- Use `DialogClose` with `type="button"` to prevent form submission

#### Icon Constants & Options

Define icon mappings at the top of widget files using `as const`:

```tsx
import { Weight, FlaskConical, Dice1 } from "lucide-react";

// ✅ Good - Icon constants for lookup
const UNIT_CATEGORY_ICONS = {
  weight: { icon: Weight, label: "Weight" },
  volume: { icon: FlaskConical, label: "Volume" },
  count: { icon: Dice1, label: "Count" },
} as const;

// ✅ Good - Icon options for dropdowns/toggles
const UNIT_CATEGORY_OPTIONS = [
  { value: "weight" as const, icon: Weight, label: "Weight" },
  { value: "volume" as const, icon: FlaskConical, label: "Volume" },
  { value: "count" as const, icon: Dice1, label: "Count" },
];
```

#### Helper Components

Create reusable helper components for common patterns:

```tsx
// ✅ Good - Reusable icon tooltip component
function IconWithTooltip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className="w-3 md:w-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

#### Icon Toggle Buttons

For toggling between options with icons:

```tsx
// ✅ Good - Icon toggle pattern with primary selection state
<button
  type="button"
  onClick={() => onChange(isSelected ? null : option.value)}
  className={cn(
    "inline-flex items-center justify-center rounded-md border p-1.5 transition-colors",
    isSelected
      ? "bg-primary text-primary-foreground border-primary"
      : "border-input hover:bg-accent",
  )}
>
  <Icon className="w-4 h-4" />
</button>
```

#### Dropdown Menu for Radio Selection

For single-selection from a list of options:

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ✅ Good - Radio dropdown pattern
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">
      {selectedLabel}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuRadioGroup value={selected} onValueChange={setSelected}>
      {options.map((opt) => (
        <DropdownMenuRadioItem key={opt.value} value={opt.value}>
          {opt.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

#### Drag-and-Drop Sortable Lists

For reorderable lists using @dnd-kit:

```tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

// ✅ Good - Sortable list setup
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  }),
);

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (active.id !== over?.id) {
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over?.id);
    const newOrder = arrayMove(items, oldIndex, newIndex);
    setItems(newOrder);
    // Call server action to persist order
  }
}

<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
    {items.map((item) => (
      <SortableItem key={item.id} item={item} />
    ))}
  </SortableContext>
</DndContext>

// ✅ Good - Sortable item component
function SortableItem({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      {/* Item content */}
    </div>
  );
}
```

#### Command Palette Search

For searchable dropdowns with many options:

```tsx
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ✅ Good - Command palette pattern
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox">
      {value || "Select option..."}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <Command>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {options.map((option) => (
            <CommandItem key={option.value} onSelect={() => setValue(option.value)}>
              {option.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

#### Success Feedback via Query Params

For showing success messages after mutations without a toast system:

```tsx
// ✅ Good - Redirect with success message after action completes
const router = useRouter();
const pathname = usePathname();

useEffect(() => {
  if (state.ok && !pending) {
    setOpen(false);
    router.push(`${pathname}?success=${encodeURIComponent("Item added!")}`);
  }
}, [state.ok, pending]);

// ✅ Good - Display and auto-clear success message
const searchParams = useSearchParams();
const success = searchParams.get("success");

useEffect(() => {
  if (success) {
    const timer = setTimeout(() => router.push(pathname), 3000);
    return () => clearTimeout(timer);
  }
}, [success]);

{success && (
  <p className="text-sm text-tertiary">{success}</p>
)}
```

#### Hidden Input Pattern for Form State

Pass client-side state through server action forms using hidden inputs:

```tsx
// ✅ Good - Hidden inputs to pass state through forms
<form action={formAction}>
  <Input type="hidden" name="unit_category" value={selectedCategory} />
  <Input type="hidden" name="location" value={selectedLocation} />
  {/* Visible form fields */}
</form>
```

#### Responsive Table Columns

Hide less-important columns on mobile:

```tsx
// ✅ Good - Responsive table with hidden columns
<table className="w-full">
  <thead>
    <tr>
      <th>Name</th>
      <th className="hidden sm:table-cell">Quantity</th>
      <th className="hidden sm:table-cell">Unit</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>{item.name}</td>
      <td className="hidden sm:table-cell">{item.quantity}</td>
      <td className="hidden sm:table-cell">{item.unit}</td>
      <td>{/* actions */}</td>
    </tr>
  </tbody>
</table>
```

#### Highlight Animation

For temporary visual feedback (e.g., highlighting a duplicate ingredient):

```tsx
// ✅ Good - Pulsing highlight with auto-clear
const [highlightId, setHighlightId] = useState<string | null>(null);

const highlightRow = (id: string) => {
  setHighlightId(id);
  setTimeout(() => setHighlightId(null), 2000);
};

<div className={cn(
  "transition-colors",
  highlightId === item.id && "animate-pulse bg-secondary/20",
)}>
  {/* row content */}
</div>
```

#### Infinite Scroll Lists

For paginated data with infinite scroll:

```tsx
// In actions.ts - export fetch function
export async function fetchInventoryItems(
  offset: number,
  limit: number,
  search: string,
  category: string,
): Promise<InventoryFetchResult> {
  const supabase = await createClient();
  let query = supabase.from("inventory").select("*");

  if (search) query = query.ilike("name", `%${search}%`);
  if (category !== "all") query = query.in("unit", units);

  const { data, error } = await query
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  return { items: data || [], ok: !error };
}

// In widgets.tsx - implement infinite scroll with intersection observer
const observerRef = useRef<IntersectionObserver | null>(null);
const loadMoreRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  if (!hasMore || loading) return;

  observerRef.current = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadMore();
  });

  if (loadMoreRef.current) {
    observerRef.current.observe(loadMoreRef.current);
  }

  return () => observerRef.current?.disconnect();
}, [hasMore, loading]);
```

### Import Organization

```typescript
// 1. React and Next.js
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// 2. Third-party libraries
import { DndContext } from "@dnd-kit/core";

// 3. Actions and types (use `import type`)
import { addItem, type Item, type ActionState } from "./actions";

// 4. UI components (shadcn first, then custom)
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/page-header";
import { UnitSwitcher } from "@/components/unit-switcher";

// 5. Utilities and icons (icons grouped together)
import { cn } from "@/lib/utils";
import { Trash2, Loader, Plus, Weight, FlaskConical } from "lucide-react";
```

### Naming Conventions

- **Files**: `kebab-case.tsx` (e.g., `breadcrumb-nav.tsx`)
- **Components**: `PascalCase` (e.g., `BreadcrumbNav`)
- **Functions**: `camelCase` (e.g., `handleSubmit`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `ITEMS_PER_LOAD`)
- **Types**: `PascalCase` (e.g., `InventoryItem`)

### Type Definitions

**Always export types from actions.ts:**

```typescript
// actions.ts
export type Item = { id: UUID; name: string };
export type ActionState = { ok: boolean; error?: string };

// page.tsx
import type { Item, ActionState } from "./actions";
```

Provide explicit return types for server actions and utility functions.

### Page Layout Pattern

All pages follow this consistent structure:

```tsx
export default function PageName({ searchParams }: PageProps) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-4 items-center">
        <PageHeader />
        <BreadcrumbNav />
        <section className="w-full max-w-5xl p-5 space-y-4">
          <div className="flex justify-between">
            <h1 className="text-2xl font-semibold">Page Title</h1>
            {/* Optional action button */}
          </div>
          <Suspense fallback={<div>Loading...</div>}>
            {/* Page content */}
          </Suspense>
        </section>
      </div>
    </main>
  );
}
```

**Key layout utilities:**
- `min-h-screen` - Full viewport height
- `max-w-5xl` - Consistent max width for content
- `space-y-4` - Consistent vertical spacing between stacked items
- `gap-4` - Consistent flex/grid gaps for side-by-side items
- `p-5` - Standard padding for sections

### Suspense Boundaries & Loading States

Always wrap async components in Suspense with meaningful fallbacks:

```tsx
// ✅ Good - Page-level suspense
<Suspense fallback={<div>Loading recipes...</div>}>
  <RecipesList />
</Suspense>

// ✅ Good - Component-level suspense with layout preservation
<Suspense fallback={<div className="h-10" />}>
  <SearchFilter />
</Suspense>

// ✅ Good - Loading state for client components
{loading && (
  <div className="flex items-center gap-2 text-muted-foreground">
    <Loader className="w-4 h-4 animate-spin" />
    Loading more...
  </div>
)}
```

**Loading state patterns:**
- Use Lucide's `Loader` icon with `animate-spin`
- Match fallback height to prevent layout shift (`h-10`, `h-20`, etc.)
- Show contextual messages ("Loading recipes..." vs. generic "Loading...")
- Use `text-muted-foreground` for loading indicators

### Grid Layout Patterns

```tsx
// ✅ Good - Responsive card grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map((item) => (
    <Card key={item.id}>...</Card>
  ))}
</div>

// ✅ Good - Form grid (two columns on larger screens)
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label>Field 1</label>
    <Input />
  </div>
  <div>
    <label>Field 2</label>
    <Input />
  </div>
</div>

// ✅ Good - Flex row with wrapping
<div className="flex flex-wrap gap-2">
  <Badge>Tag 1</Badge>
  <Badge>Tag 2</Badge>
</div>
```

**Common grid patterns:**
- Cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Forms: `grid-cols-1 md:grid-cols-2`
- Consistent gaps: Use `gap-4` or `gap-2` for tighter spacing

### Button Variants & Patterns

```tsx
// ✅ Primary action
<Button variant="default">Save</Button>

// ✅ Secondary/cancel action
<Button variant="outline">Cancel</Button>

// ✅ Destructive action with text
<Button variant="destructive">
  <Trash2 className="w-4 h-4" />
  Delete
</Button>

// ✅ Destructive icon-only button
<Button variant="iconDestructive" size="icon">
  <Trash2 className="w-4 h-4" />
</Button>

// ✅ Minimal icon-only button (no hover styling)
<Button variant="icon" size="icon">
  <Settings className="w-4 h-4" />
</Button>

// ✅ Ghost button (subtle hover)
<Button variant="ghost" size="icon">
  <Menu className="w-4 h-4" />
</Button>

// ✅ Link as button
<Button asChild variant="default" size="lg">
  <Link href="/path">Go There</Link>
</Button>

// ✅ Toggle state button
<Button variant={isActive ? "default" : "outline"}>
  {isActive ? "Active" : "Inactive"}
</Button>
```

**Custom button variants** (defined in [components/ui/button.tsx](components/ui/button.tsx)):
- `icon` - No styling, for icon buttons that handle their own hover
- `iconDestructive` - `text-destructive` only, for destructive icon buttons
- `destructive` - Bordered with red text, fills red on hover

**Hover state patterns:**
- Use `/80` for button hover states: `hover:bg-primary/80`
- Use `/10` for ghost/outline hovers: `hover:bg-accent/10`
- Use `/80` for badge hover states: `hover:bg-primary/80`

### Badge Usage Patterns

```tsx
// ✅ Primary badge (default)
<Badge>Total: 45m</Badge>

// ✅ Secondary badge (warnings, highlights)
<Badge variant="secondary">Low Stock</Badge>

// ✅ Destructive badge (errors, critical)
<Badge variant="destructive">Out of Stock</Badge>

// ✅ Outline badge (neutral info)
<Badge variant="outline">Optional</Badge>

// ✅ Ghost badge (minimal, text-only)
<Badge variant="ghost">Label</Badge>

// ✅ Ghost accent badge (subtle background, used for recipe timing)
<Badge variant="ghostAccent">Total: 45m</Badge>
```

**Custom badge variants** (defined in [components/ui/badge.tsx](components/ui/badge.tsx)):
- `ghost` - Minimal text-only badge, no background or border
- `ghostAccent` - `py-2 bg-secondary/40`, used for recipe timing badges on cards

**Common badge uses:**
- Recipe timing information (`ghostAccent`)
- Inventory status (in stock, low, out)
- Category labels
- Status indicators

### Card Component Patterns

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

// ✅ Good - Full card structure (compact by default: p-2 padding, bg-card/40)
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter>
    {/* Optional footer actions */}
  </CardFooter>
</Card>

// ✅ Good - Clickable card (wrap in Link)
<Card className="flex flex-col">
  <Link href={`/food/recipes/${recipe.id}`}>
    <CardHeader>
      <CardTitle>{recipe.name}</CardTitle>
    </CardHeader>
    <CardContent className="flex gap-2 flex-wrap">
      <Badge variant="ghostAccent">Total: {recipe.total_minutes}m</Badge>
      <Badge variant="outline">Cook: {recipe.cook_minutes}m</Badge>
    </CardContent>
  </Link>
</Card>
```

**Card defaults** (customized in [components/ui/card.tsx](components/ui/card.tsx)):
- `Card`: `bg-card/40` (semi-transparent background), `rounded-xl`
- `CardHeader`: `p-2` (compact padding)
- `CardContent`: `p-2 pt-0`
- `CardTitle`: `text-lg font-semibold`

**Card usage patterns:**
- Recipe cards in grid layouts
- Information display sections
- Form containers
- Dashboard widgets

### Text Hierarchy

```tsx
// ✅ Page title
<h1 className="text-2xl font-semibold">Page Title</h1>

// ✅ Section heading
<h2 className="text-xl font-semibold">Section Title</h2>

// ✅ Card title (uses CardTitle component)
<CardTitle>Card Title</CardTitle>

// ✅ Body text (default, no classes needed)
<p>Regular body text</p>

// ✅ Secondary/muted text
<p className="text-muted-foreground">Secondary information</p>

// ✅ Small text (labels, captions)
<p className="text-sm">Small text</p>

// ✅ Extra small text (fine print)
<p className="text-xs">Extra small text</p>

// ✅ Hover effects on links
<Link href="/path" className="hover:text-primary hover:uppercase">
  link text
</Link>
```

### Custom SVG Icon Components

For custom icons not in Lucide, create components in [components/ui/](components/ui/):

```tsx
// components/ui/custom-icon.tsx
export function CustomIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <title>icon-name</title>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="..." // SVG path data
      />
    </svg>
  );
}
```

**Key attributes:**
- `viewBox` - Defines coordinate system
- `aria-hidden="true"` - Hides from screen readers (wrapped in button with label)
- `fill="currentColor"` - Inherits text color
- `{...props}` - Allows className overrides (e.g., `className="w-4 h-4"`)

### Error Display Pattern

Use semantic colors and consistent element types:

```typescript
// ✅ Form errors - use <p> tag
{!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

// ✅ Server component errors
if (error) return <div className="text-destructive">Error: {error.message}</div>;

// ✅ Empty states with muted text
<div className="py-8 text-center text-muted-foreground">
  No items found.
</div>

// ✅ Delete icon button with destructive variant
<Button variant="iconDestructive" size="icon">
  <Trash2 className="w-4 h-4" />
</Button>
```

### Code Formatting Best Practices

**Use early returns:**
```typescript
if (!name) return { ok: false, error: "Name required" };
// Main logic here
```

**Destructuring:**
```typescript
const { data, error } = await query;
const { name, on_hand_qty: quantity } = item;
```

**Optional chaining:**
```typescript
const search = searchParams.get("q") ?? "";
const quantity = item?.on_hand_qty ?? 0;
```

**Section dividers** (files > 200 lines):
```typescript
// ─────────────────────────────────────────────────────────────────────────────
// Section Name
// ─────────────────────────────────────────────────────────────────────────────
```

**Common section names:**
- `Icon Constants` - Icon mappings and option arrays
- `Shared UI Components` - Helper components used within the file
- `Main Components` - Primary exported components
- `Utilities` - Helper functions
- `Types` - Type definitions (if not in actions.ts)

## Environment Variables

Required environment variables (set in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Check [lib/utils.ts](lib/utils.ts#L9-L11) for environment variable validation.

## Key Implementation Notes

1. **Type Safety**: TypeScript strict mode is enabled. Always provide proper types for Supabase queries and form data.

2. **Cookie Handling**: When creating custom responses in route handlers, always copy cookies from the Supabase response to avoid session desync. See [docs/architecture/auth-and-access.md](docs/architecture/auth-and-access.md) for the full proxy session-management rules.

3. **shadcn/ui**: Add new components using `npx shadcn@latest add <component-name>`. Configuration in [components.json](components.json).

4. **Theming**: The app uses CSS variables for theming (defined in [app/globals.css](app/globals.css)). Dark mode is handled by next-themes with class-based strategy.
