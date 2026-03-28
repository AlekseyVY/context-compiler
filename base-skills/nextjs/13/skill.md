---
name: nextjs-13
description: Next.js v13 patterns, idioms and breaking changes for AI coding agents
---

# Next.js 13 — Skill File

## What changed in this version

Next.js 13 introduced the `app/` directory as the new routing paradigm, replacing `pages/` with file-based conventions (`layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`). Components inside `app/` are **React Server Components by default** — client interactivity requires an explicit `"use client"` directive. Data fetching moved away from `getServerSideProps` / `getStaticProps` / `getStaticPaths` entirely; instead, native `fetch()` with cache options controls rendering strategy per-request. `next/link` no longer wraps an `<a>` tag, and `next/image` dropped the `layout` prop in favor of `fill` and `sizes`.

---

## Core patterns — DO

**Use `app/` directory conventions for routing**
```typescript
// app/dashboard/page.tsx      → /dashboard
// app/dashboard/layout.tsx    → persistent shell
// app/dashboard/loading.tsx   → automatic Suspense boundary
```
Every route segment is a folder; `page.tsx` is the only file that makes a segment publicly accessible.

**Mark client components explicitly**
```typescript
"use client"; // must be the very first line
import { useState } from "react";
export default function Counter() { ... }
```
All components in `app/` are Server Components unless this directive is present. Never add it unless the component uses browser APIs, hooks, or event handlers.

**Use `fetch()` with cache options for data fetching**
```typescript
// SSR equivalent — no caching
const data = await fetch("https://api.example.com/data", { cache: "no-store" });

// SSG equivalent — cache forever until revalidated
const data = await fetch("https://api.example.com/data", { next: { revalidate: 3600 } });
```
`getServerSideProps` and `getStaticProps` do not exist in the `app/` router.

**Define layouts for shared UI**
```typescript
// app/layout.tsx — required root layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
```
The root `app/layout.tsx` must render `<html>` and `<body>`; Next.js no longer injects these automatically.

**Use `next/font` for font loading**
```typescript
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });
export default function RootLayout({ children }) {
  return <html className={inter.className}><body>{children}</body></html>;
}
```
Never use `<link>` tags to load Google Fonts; `next/font` eliminates layout shift and external requests at build time.

**Use `next/link` without an inner `<a>` tag**
```typescript
import Link from "next/link";
// Correct
<Link href="/about">About</Link>
// Wrong — double-renders anchor
<Link href="/about"><a>About</a></Link>
```

**Use `next/image` with `fill` instead of `layout`**
```typescript
<Image src="/hero.jpg" alt="Hero" fill sizes="100vw" />
// NOT: layout="fill" — that prop was removed
```

---

## Anti-patterns — AVOID in 13

**Using `getServerSideProps` / `getStaticProps` in `app/`** — These functions only work inside `pages/`. In `app/`, use `fetch()` with cache directives directly inside async Server Components.

**Wrapping `<Link>` with `<a>`** — Next.js 13 renders the anchor automatically. Adding `<a>` inside `<Link>` produces invalid nested anchor HTML.

**Using `layout` prop on `next/image`** — The `layout`, `objectFit`, and `objectPosition` props were removed. Use `fill` + CSS (`object-fit`) instead.

**Putting `useState` / `useEffect` in Server Components** — Server Components have no component lifecycle. Any file in `app/` that uses React hooks must declare `"use client"` as its first line.

**Importing server-only modules into client components** — Database clients, `fs`, and secrets must stay in Server Components or Route Handlers (`app/api/.../route.ts`). Importing them into a `"use client"` file will cause build errors or secret leaks.

**Using `pages/api/` patterns for new API routes** — New API routes in `app/` use Route Handlers with named HTTP method exports (`export async function GET(req: Request) {}`), not the default export handler pattern from `pages/api/`.

---

## Version-specific notes for AI agents

- The `app/` and `pages/` directories can coexist in Next.js 13 — never generate a `pages/` file for a route that already exists in `app/`, as this causes a conflict.
- `async` Server Components are valid and encouraged — write `export default async function Page()` freely inside `app/`; this syntax is invalid in `pages/`.
- `error.tsx` must be a Client Component (`"use client"`) — Next.js requires this because error boundaries are a React client feature.
- Metadata is exported as an object or `generateMetadata` function from `page.tsx` or `layout.tsx` — never use `<Head>` from `next/head` inside `app/`.
- Route Handlers live at `app/api/[route]/route.ts` and export named functions (`GET`, `POST`, `PUT`, `DELETE`) — the old `req`/`res` Node.js signature does not apply; use the Web `Request`/`Response` API.