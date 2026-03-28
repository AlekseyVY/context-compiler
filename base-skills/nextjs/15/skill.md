---
name: nextjs-15
description: Next.js v15 patterns, idioms and breaking changes for AI coding agents
---

# Next.js 15 — Skill File

## What changed in this version

`params` and `searchParams` props in pages, layouts, and route handlers are now **Promises** — you must `await` them before accessing their values. The `fetch` API no longer caches responses by default; all fetches are uncached (`cache: 'no-store'`) unless you explicitly opt in. The `cookies()` and `headers()` APIs from `next/headers` are now async and must be awaited. React 19 is the minimum peer dependency, meaning server components, actions, and `use()` hook patterns align with the React 19 API surface.

---

## Core patterns — DO

**Await params and searchParams in pages**
```typescript
// app/blog/[slug]/page.tsx
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // params is a Promise — always await it
}
```

**Await cookies and headers**
```typescript
import { cookies, headers } from 'next/headers';

const cookieStore = await cookies(); // async in v15
const token = cookieStore.get('token');
```

**Opt into fetch caching explicitly**
```typescript
// Cached (ISR-style)
const data = await fetch('/api/data', { next: { revalidate: 60 } });

// Force uncached (default behavior, explicit for clarity)
const live = await fetch('/api/live', { cache: 'no-store' });
```

**Use `next/form` for client navigations with forms**
```typescript
import Form from 'next/form';
// Prefetches the target route; integrates with Server Actions natively
<Form action="/search"><input name="q" /><button>Search</button></Form>
```

**Use `unstable_after` for post-response side effects**
```typescript
import { unstable_after as after } from 'next/server';

export async function POST() {
  after(() => logAnalytics()); // runs after response is sent — never blocks the user
  return Response.json({ ok: true });
}
```

---

## Anti-patterns — AVOID in v15

**Accessing params synchronously**
Before: `({ params }) => <div>{params.slug}</div>`
After: params is a Promise — sync access returns `undefined` silently.

**Assuming fetch is cached**
In v14 and earlier, `fetch` was cached by default. In v15 it is not. Never omit `{ next: { revalidate } }` when you intend caching; relying on the default is now wrong.

**Using `cookies()` or `headers()` without await**
Both are async functions in v15. Calling them without `await` returns a Promise object, not the value — a silent bug.

**Using `<form>` instead of `<Form>` for search/navigation flows**
The native `<form>` element loses the prefetching and loading-state integration that `next/form` provides. Prefer `next/form` for any form that triggers a page navigation.

---

## Version-specific notes for AI agents

- The type of `params` and `searchParams` in page/layout props is `Promise<{ [key: string]: string }>`, not a plain object. Always generate the `Promise<...>` type annotation.
- `generateStaticParams` still returns plain (non-Promise) objects — it is the only place params are not wrapped in a Promise.
- `cookies()` and `headers()` calls that are not awaited will not throw at build time; they fail silently at runtime. Always emit `await`.
- When scaffolding route handlers, never rely on implicit caching — always declare `cache` or `next.revalidate` explicitly.
- The `use cache` directive (for fine-grained caching of functions and components) is available but experimental in v15. Do not generate it unless the user explicitly requests experimental features.