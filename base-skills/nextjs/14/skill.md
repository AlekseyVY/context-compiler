---
name: nextjs-14
description: Next.js v14 patterns, idioms and breaking changes for AI coding agents
---

# Next.js 14 — Skill File

## What changed in this version

Next.js 14 stabilizes the App Router (introduced in 13) as the recommended architecture, making the `app/` directory the default over `pages/`. Server Actions graduate from alpha to stable, replacing the need for dedicated API routes for form mutations. The `next/font` and `next/image` components have updated required props. The `pages/` router still works but receives no new features — all new patterns target `app/`.

---

## Core patterns — DO

**Use Server Components by default**
```tsx
// app/users/page.tsx — no "use client" needed
export default async function UsersPage() {
  const users = await db.user.findMany(); // runs on server, never ships to client
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```
Server Components are the default in `app/`; add `"use client"` only when you need interactivity or browser APIs.

**Use Server Actions for mutations**
```tsx
// Defined inline or in a separate "use server" file
async function createUser(formData: FormData) {
  "use server";
  await db.user.create({ data: { name: formData.get("name") as string } });
  revalidatePath("/users");
}
// Used directly in JSX — no API route needed
<form action={createUser}><input name="name" /><button type="submit">Add</button></form>
```
Server Actions let you colocate mutation logic with UI without writing a separate `POST /api/*` handler.

**Use `generateMetadata` for dynamic SEO**
```tsx
export async function generateMetadata({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  return { title: post.title, description: post.excerpt };
}
```
Static `export const metadata` handles static pages; `generateMetadata` handles routes that need runtime data.

**Use `loading.tsx` and `error.tsx` for route-level UI states**
```
app/dashboard/loading.tsx  → shown while page.tsx suspends
app/dashboard/error.tsx    → shown when page.tsx throws
```
These files replace manual `<Suspense>` and error boundary boilerplate per route segment.

**Fetch data directly in Server Components — skip `getServerSideProps`**
```tsx
// This pattern replaces getServerSideProps entirely in app/
const data = await fetch("https://api.example.com/data", { cache: "no-store" });
```
`{ cache: "no-store" }` is the equivalent of `getServerSideProps`; omit it (or use `force-cache`) for static/ISR behavior.

**Use `next/font` with no `src` for Google Fonts**
```tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });
// Apply: <html className={inter.className}>
```
`next/font` self-hosts fonts at build time; never import Google Fonts via a `<link>` tag.

---

## Anti-patterns — AVOID in 14

**Using `getServerSideProps` or `getStaticProps` in the `app/` directory.** These lifecycle functions only exist in `pages/`. In `app/`, fetch directly inside async Server Components.

**Wrapping entire pages in `"use client"`.** This opts the whole tree out of server rendering. Keep Client Components as leaves; pass server-fetched data as props.

**Creating API routes just for form submissions.** Server Actions handle this more directly. Reserve `app/api/` routes for webhook receivers, third-party callbacks, or endpoints consumed by external clients.

**Using `<img>` instead of `next/image`.** Raw `<img>` skips automatic optimization and the required `width`/`height` (or `fill`) props enforcement that prevents layout shift.

**Importing `useRouter` from `next/router` in `app/` components.** In the App Router, always import from `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`).

---

## Version-specific notes for AI agents

- `app/` and `pages/` can coexist in one project, but never mix App Router and Pages Router patterns within the same route — pick one per file tree branch.
- `useSearchParams()` in a Client Component must be wrapped in `<Suspense>` or the build will fail; Next.js 14 enforces this at compile time.
- `revalidatePath()` and `revalidateTag()` must be called from Server Actions or Route Handlers — never from Client Components.
- The `params` and `searchParams` props on `page.tsx` are plain objects, not `URLSearchParams` instances — access them with `params.id`, not `params.get("id")`.
- `next/headers` functions (`cookies()`, `headers()`) can only be called inside Server Components, Server Actions, or Route Handlers — calling them in Client Components throws at runtime.