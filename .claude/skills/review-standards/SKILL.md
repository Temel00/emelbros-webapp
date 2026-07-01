---
name: review-standards
description: Review code against project coding standards defined in CLAUDE.md. Checks color usage, component patterns, responsive design, form patterns, imports, types, and overall style compliance.
argument-hint: "[file-path or pattern]"
allowed-tools: Read, Grep, Glob
---

# Code Standards Review

Perform a comprehensive review of code against the project's CLAUDE.md coding standards.

## Review Process

When invoked with $ARGUMENTS:

1. **Identify Files to Review**
   - If no argument: Review recently modified files from git status
   - If file path: Review that specific file
   - If pattern (*.tsx): Use Glob to find matching files
   - Focus on .tsx, .ts, and .css files

2. **Read Each File**
   - Use Read tool to examine file contents
   - Note line numbers for any violations found

3. **Check Against Standards** (in order of importance)

## Standards Checklist

### 🎨 CRITICAL: Color System & Theme Usage

**Rule**: Never use hardcoded color classes. Always use semantic theme colors.

Check for violations:
- ❌ BAD: `text-red-600`, `bg-blue-500`, `text-green-600`, `border-gray-300`
- ✅ GOOD: `text-destructive`, `bg-primary`, `text-tertiary`, `border-input`

**Semantic color mappings** (from CLAUDE.md):
- Errors/Destructive → `text-destructive`, `bg-destructive`, `bg-destructive/10`
- Success/Positive → `text-tertiary`, `bg-tertiary`
- Warnings/Alerts → `text-secondary`, `bg-secondary`, `bg-secondary/20`
- Primary Actions → `bg-primary`, `text-primary`, `text-primary-foreground`
- Accent → `bg-accent`, `bg-accent/10`, `bg-accent/20`
- Muted/Secondary → `text-muted-foreground`

**Search patterns** to flag:
```regex
text-(red|blue|green|yellow|purple|pink|gray|slate|zinc)-(\\d{3})
bg-(red|blue|green|yellow|purple|pink|gray|slate|zinc)-(\\d{3})
border-(red|blue|green|yellow|purple|pink|gray|slate|zinc)-(\\d{3})
```

### 🧩 Component Usage

**Rule**: Always use shadcn/ui components, never custom styled HTML elements.

Check for violations:
- ❌ BAD: `<input className="border px-2 py-1 h-10 rounded" />`
- ❌ BAD: `<button className="border px-3 py-1 rounded">Click</button>`
- ✅ GOOD: `<Input />`, `<Button>Click</Button>`

**Look for**: Native HTML form elements with styling classes instead of shadcn imports.

### 📱 Mobile-First Responsive Design

**Rule**: Always design for mobile first, then enhance for larger screens.

Check for violations:
- ❌ BAD: `lg:w-4 w-8` (desktop-first)
- ✅ GOOD: `w-4 md:w-5` (mobile-first)

**Common responsive patterns**:
- Icons: `w-3 md:w-4` or `w-4 md:w-5`
- Text: `text-xs md:text-sm` or `text-sm md:text-base`
- Grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

**Search for**: Reverse breakpoint order (lg before md, md before base)

### 📋 Form Field Patterns

Check for proper form structure:
- Labels use `text-sm font-medium`
- Field groups use `space-y-2` (label + input)
- Forms use `space-y-4` (between field groups)
- Labels have `htmlFor` matching input `id`
- Required fields have `required` attribute
- Inputs have appropriate placeholders

**Example pattern**:
```tsx
<div className="space-y-2">
  <label htmlFor="name" className="text-sm font-medium">Name</label>
  <Input id="name" name="name" required />
</div>
```

### 🎭 Transition & Animation Patterns

Check for smooth transitions:
- Buttons should have `transition-colors`
- Loading spinners should have `animate-spin`
- Inputs should have `transition-[color,box-shadow]` for focus states

### 📦 Import Organization

**Rule**: Imports must follow this order:

1. React and Next.js
2. Third-party libraries
3. Actions and types (use `import type`)
4. UI components (shadcn first, then custom)
5. Utilities and icons (icons grouped together)

**Example**:
```tsx
// 1. React/Next
import { useState } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party
import { DndContext } from "@dnd-kit/core";

// 3. Actions/types
import { addItem, type ActionState } from "./actions";

// 4. UI components
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

// 5. Utilities/icons
import { cn } from "@/lib/utils";
import { Trash2, Loader } from "lucide-react";
```

### 🏗️ Architecture Patterns

**Supabase Client Pattern** (CRITICAL):
- ❌ NEVER create global Supabase clients
- ✅ ALWAYS create clients inside functions
- Server components: `const supabase = await createClient()` from `@/lib/supabase/server`
- Client components: `const supabase = createClient()` from `@/lib/supabase/client`

**Server Actions Pattern**:
- File must start with `"use server";`
- Export `ActionState` type: `{ ok: boolean; error?: string }`
- Actions must call `revalidatePath()` after mutations
- Handle PostgrestError codes (e.g., `23505` for unique violations)

**File Organization**:
- `page.tsx` - Server component for data fetching
- `widgets.tsx` - Client components for interactive UI
- `actions.ts` - Server actions for mutations

### 🎯 Type Definitions

Check for:
- `import type` syntax for type imports
- Explicit return types for server actions
- Types exported from `actions.ts`
- No `any` types (TypeScript strict mode)

### 🎪 UI Pattern Compliance

**Dialog Forms**:
- Use `useActionState` with server actions
- Define `initialState: ActionState = { ok: true }` at top
- Close dialog with `useEffect` watching `state.ok && !pending`
- Show loading state with `<Loader className="w-4 h-4 animate-spin" />`
- Display errors: `{!state.ok && <p className="text-sm text-destructive">{state.error}</p>}`

**Icon Constants**:
- Define at top with `as const`
- Example: `const ICONS = { ... } as const;`

**Tooltips**:
- Always wrap icon buttons with tooltips

### 📏 Page Layout Pattern

Check for consistent structure:
```tsx
<main className="min-h-screen flex flex-col items-center">
  <div className="flex-1 w-full flex flex-col gap-4 items-center">
    <PageHeader />
    <BreadcrumbNav />
    <section className="w-full max-w-5xl p-5 space-y-4">
      {/* Content */}
    </section>
  </div>
</main>
```

### 🔤 Naming Conventions

- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Types: `PascalCase`

### 🎨 Text Hierarchy

- Page title: `text-2xl font-semibold`
- Section heading: `text-xl font-semibold`
- Muted text: `text-muted-foreground`
- Small text: `text-sm`
- Extra small: `text-xs`

### ⚠️ Error Display

- Form errors: `<p className="text-sm text-destructive">{error}</p>`
- Use `<p>` tags for form errors, not `<div>`
- Empty states: `text-muted-foreground`

## Output Format

For each file reviewed, provide:

### ✅ What's Good
List patterns that are correctly implemented

### ❌ Violations Found

For each violation:
1. **Severity**: Critical | Major | Minor | Suggestion
2. **Category**: Color System | Components | Responsive | Forms | etc.
3. **Line**: Specific line number(s)
4. **Issue**: Description of the violation
5. **Fix**: Concrete example of how to fix it

Example:
```
❌ CRITICAL - Color System - Line 42
Issue: Hardcoded color class `text-red-600` used for error message
Fix: Replace with semantic color:
  - text-red-600
  + text-destructive
```

### 📊 Summary

- Total violations: X
- Critical: X | Major: X | Minor: X | Suggestions: X
- Overall compliance: XX%

### 💡 Recommendations

Prioritized list of actions to take.

## Additional Notes

- Reference specific CLAUDE.md sections for detailed explanations
- Focus on teaching patterns, not just pointing out errors
- Highlight clever implementations that follow standards well
- Consider context: some patterns may have valid exceptions
