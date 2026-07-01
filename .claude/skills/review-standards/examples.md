# Code Standards Examples

Quick reference for common violations and fixes.

## Color System Violations

### ❌ Common Violations
```tsx
// Hardcoded red for errors
<p className="text-red-600">{error}</p>

// Hardcoded green for success
<div className="bg-green-500">Success!</div>

// Hardcoded blue for accents
<Badge className="bg-blue-400">New</Badge>

// Gray for muted text
<span className="text-gray-500">Optional</span>
```

### ✅ Correct Usage
```tsx
// Semantic destructive for errors
<p className="text-destructive">{error}</p>

// Semantic tertiary for success
<div className="bg-tertiary">Success!</div>

// Semantic accent for highlights
<Badge className="bg-accent">New</Badge>

// Semantic muted for secondary text
<span className="text-muted-foreground">Optional</span>
```

## Component Violations

### ❌ Common Violations
```tsx
// Custom styled input
<input
  type="text"
  className="border border-gray-300 px-3 py-2 rounded-md"
/>

// Custom styled button
<button className="bg-blue-500 text-white px-4 py-2 rounded">
  Submit
</button>

// Custom styled select
<select className="border px-2 py-1 rounded">
  <option>Option 1</option>
</select>
```

### ✅ Correct Usage
```tsx
// shadcn Input component
<Input type="text" />

// shadcn Button component
<Button>Submit</Button>

// shadcn Select component
<Select>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

## Responsive Design Violations

### ❌ Common Violations (Desktop-First)
```tsx
// Large icons shrinking on mobile
<Icon className="w-6 md:w-4" />

// Text getting smaller on mobile
<p className="text-base md:text-sm">Content</p>

// Grid collapsing to single column on mobile
<div className="grid-cols-3 md:grid-cols-1">
```

### ✅ Correct Usage (Mobile-First)
```tsx
// Small icons growing on desktop
<Icon className="w-4 md:w-6" />

// Small text growing on desktop
<p className="text-sm md:text-base">Content</p>

// Single column expanding to grid on larger screens
<div className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

## Import Organization Violations

### ❌ Common Violations
```tsx
// Unorganized imports
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ActionState } from "./actions";
import { cn } from "@/lib/utils";
```

### ✅ Correct Usage
```tsx
// Properly organized imports
// 1. React/Next
import { useState } from "react";

// 2. Third-party
// (none in this example)

// 3. Actions/types
import type { ActionState } from "./actions";

// 4. UI components
import { Button } from "@/components/ui/button";

// 5. Utilities/icons
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
```

## Supabase Client Violations

### ❌ CRITICAL Violation
```tsx
// Global Supabase client (breaks Fluid compute)
const supabase = createClient();

export default function Page() {
  const { data } = await supabase.from("table").select("*");
  // ...
}
```

### ✅ Correct Usage
```tsx
// Client created inside function
export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("table").select("*");
  // ...
}
```

## Form Pattern Violations

### ❌ Common Violations
```tsx
// Missing label, no spacing, inline styles
<div>
  <input
    name="email"
    className="border px-2 py-1"
    placeholder="Email"
  />
</div>

// Label without htmlFor
<label>Name</label>
<Input name="name" />
```

### ✅ Correct Usage
```tsx
// Proper spacing, semantic label, htmlFor connection
<div className="space-y-2">
  <label htmlFor="email" className="text-sm font-medium">
    Email
  </label>
  <Input
    id="email"
    name="email"
    type="email"
    required
    placeholder="you@example.com"
  />
</div>
```

## Server Action Violations

### ❌ Common Violations
```tsx
// Missing "use server"
import { createClient } from "@/lib/supabase/server";

export async function addItem(formData: FormData) {
  // ...
}

// No error handling
export async function addItem(formData: FormData) {
  "use server";
  const supabase = await createClient();
  await supabase.from("items").insert({ name: formData.get("name") });
  // Missing revalidatePath, no error handling
}
```

### ✅ Correct Usage
```tsx
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  ok: boolean;
  error?: string;
};

export async function addItem(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const { error } = await supabase.from("items").insert({ name });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/path");
  return { ok: true };
}
```

## Dialog Form Violations

### ❌ Common Violations
```tsx
// No loading state, manual form handling, no error display
function AddDialog() {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Manual form handling...
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form onSubmit={handleSubmit}>
        <Input name="name" />
        <Button type="submit">Save</Button>
      </form>
    </Dialog>
  );
}
```

### ✅ Correct Usage
```tsx
import { useActionState, useEffect } from "react";
import { addItem, type ActionState } from "./actions";

const initialState: ActionState = { ok: true };

function AddDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addItem, initialState);

  // Close on success
  useEffect(() => {
    if (state.ok && !pending) {
      setOpen(false);
    }
  }, [state.ok, pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
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

## Transition Violations

### ❌ Missing Transitions
```tsx
// Button with no transition
<Button className="hover:bg-primary/90">Click</Button>

// Input with no focus transition
<Input className="focus:ring-2" />
```

### ✅ With Transitions
```tsx
// Button with smooth color transition
<Button className="transition-colors hover:bg-primary/90">Click</Button>

// Input with smooth focus transition
<Input className="transition-[color,box-shadow] focus-visible:ring-ring/50" />

// Loading spinner
<Loader className="w-4 h-4 animate-spin" />
```
