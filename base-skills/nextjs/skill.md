---
name: nextjs-generic
description: Next.js v13+ (App Router era) patterns, idioms and breaking changes for AI coding agents
---

# Next.js (App Router Era) — Skill File

## What changed in this version

Next.js shifted from the Pages Router (`pages/`) to the App Router (`app/`) as the default architecture starting in v13.4. This change fundamentally affects how routing, layouts, data fetching, and component rendering are structured. Server Components are now the default — every component in `app/` is a Server Component unless explicitly marked `"use client"`. Data fetching moved from `getServerSideProps`/`getStaticProps` into async Server Components and the `fetch` API with caching options. Route segments, layouts, loading states, and error boundaries are now file-convention-based inside `app/`.

## Core patterns — DO

**Use async Server Components for data fetching**
```typescript
// app/users/page.tsx
export default async function UsersPage() {
  const users = await fetch("https://api.example.com/users", {
    next: { revalidate: 60 }, // ISR: revalidate every 60s
  }).then((r) => r.json());
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```
Server Components run only on the server, so they can safely fetch data without exposing secrets or adding client bundle weight.

**Mark interactive components explicitly with `"use client"`**
```typescript
"use client";
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```
Without this directive, React hooks and browser APIs will throw at runtime because the component runs on the server.

**Define shared UI with `layout.tsx`, not `_app.tsx`**
```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
```
`layout.tsx` persists across route transitions and replaces the old `_app.tsx` and `_document.tsx` patterns entirely.

**Use `loading.tsx` for streaming suspense boundaries**
```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return <p>Loading dashboard...</p>;
}
```
Next.js automatically wraps the co-located `page.tsx` in a `<Suspense>` boundary using this file, enabling streaming without manual setup.

**Use Server Actions for mutations instead of API routes**
```typescript
// app/actions.ts
"use server";
export async function createPost(formData: FormData) {
  const title = formData.get("title");
  await db.post.create({ data: { title } });
}
```
Server Actions run securely on the server and can be called directly from forms or Client Components, eliminating the need for `/api` boilerplate for simple mutations.

**Use `next/image` with required `alt` and explicit sizing**
```typescript
import Image from "next/image";
<Image src="/hero.png" alt="Hero banner" width={1200} height={600} priority />
```
Omitting `width`/`height` or `fill` causes a build error; `priority` prevents layout shift for above-the-fold images.

**Generate metadata via `export const metadata` or `generateMetadata`**
```typescript
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  return { title: post.title, description: post.excerpt };
}
```
This replaces `next/head` for all `<head>` tag management inside the App Router.

## Anti-patterns — AVOID

**Never use `getServerSideProps` or `getStaticProps` in `app/`**
These functions only work inside `pages/`. In `app/`, fetch data directly inside async Server Components. Mixing both routers in one file causes a runtime error.

**Never import server-only code into Client Components**
```typescript
// ❌ Wrong — will expose DB credentials in the browser bundle
"use client";
import { db } from "@/lib/db"; // server-only module
```
Use the `server-only` package or pass data as props from a parent Server Component instead.

**Never use `useRouter` from `next/router` in the App Router**
```typescript
// ❌ Wrong
import { useRouter } from "next/router";
// ✅ Correct
import { useRouter } from "next/navigation";
```
`next/router` is Pages Router only. `next/navigation` exposes `useRouter`, `usePathname`, and `useSearchParams` for App Router.

**Never nest `<html>` or `<body>` outside `app/layout.tsx`**
Only the root layout renders `<html>` and `<body>`. Child layouts must return fragments or container elements only, or Next.js will throw a hydration error.

**Avoid placing `"use client"` at the top of large component trees**
Marking a parent as a Client Component converts the entire subtree to client-side rendering. Push `"use client"` as deep as possible — to the specific leaf components that actually need interactivity.

## Version-specific notes for AI agents

- The default export of every file in `app/` is treated as a Server Component. Never assume client-side behavior without `"use client"` at the top of the file.
- `fetch` in Server Components is extended by Next.js to support `{ cache: "no-store" }` (SSR) and `{ next: { revalidate: N } }` (ISR). Always set an explicit cache strategy — the default is aggressive caching.
- Route params (`params`) and search params (`searchParams`) are passed as props to `page.tsx` — they are not accessed via hooks in Server Components.
- Dynamic routes use folder names like `[slug]` and catch-all routes use `[...slug]`. The file must export `generateStaticParams` for static generation of dynamic segments.
- `error.tsx` must include `"use client"` — it is always a Client Component because it needs to use the `reset` callback from React's error boundary API.