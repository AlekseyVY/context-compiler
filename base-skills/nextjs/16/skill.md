---
name: nextjs-16
description: Next.js v16 patterns, idioms and breaking changes for AI coding agents
---

# Next.js 16 — Skill File

## What changed in this version

Synchronous access to `params`, `searchParams`, `cookies()`, and `headers()` is fully removed — v15 allowed it with a deprecation warning, v16 throws at runtime. The experimental PPR flag (`experimental.ppr`) is gone; its replacement is the `'use cache'` directive, which makes caching explicit and opt-in rather than implicit. `middleware.ts` is deprecated in favor of `proxy.ts`, which runs on Node.js only — Edge runtime support for the middleware layer is dropped. Turbopack is now the default bundler for both `next dev` and `next build`, meaning no Webpack config assumptions are safe. React 19.2 ships as the peer dependency, bringing View Transitions, `useEffectEvent`, and `<Activity />`.

---

## Core patterns — DO

**Async params and searchParams — always await them**

```typescript
// app/blog/[slug]/page.tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params        // must await
  const query   = await props.searchParams   // must await
  ...
}
```
Run `npx next typegen` once to generate `PageProps<'/path/[param]'>` helpers globally — this gives fully type-safe access without manually typing the shape of every route.

**Cache with `'use cache'` directive — not fetch options**

```typescript
// app/products/page.tsx
'use cache'   // directive at the top of the file OR inside the function body
import { cacheLife, cacheTag } from 'next/cache'

export default async function ProductsPage() {
  cacheLife('hours')      // built-in profile: seconds | minutes | hours | days | weeks
  cacheTag('products')    // tag for targeted invalidation
  const data = await db.product.findMany()
  return <List items={data} />
}
```
`'use cache'` is the only supported caching primitive in v16; the `fetch` cache options and `export const revalidate` still work but `'use cache'` is the canonical new pattern.

**Use `proxy.ts` for request interception — not `middleware.ts`**

```typescript
// proxy.ts  (project root, same location as middleware.ts was)
import type { NextRequest } from 'next/server'
import { NextResponse }     from 'next/server'

export function proxy(request: NextRequest) {
  if (!request.cookies.get('token')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = { matcher: ['/dashboard/:path*'] }
```
`proxy.ts` exports a function named `proxy`, not `middleware`. It runs exclusively on Node.js — never assume Edge globals are available.

**Parallel routes — always provide `default.js` for every slot**

```typescript
// app/@modal/default.tsx
export default function Default() { return null }
```
Empty parallel route slots without a `default.js` throw in v16. Every `@slot` directory must have one.

**React Compiler — enable only for client-heavy code**

```javascript
// next.config.ts
const config = { reactCompiler: true }
```
The React Compiler is stable but disabled by default. Enable it when you have complex client components with expensive re-renders; server-rendered pages see no benefit and can regress in edge cases.

**Generate static params with async functions**

```typescript
export async function generateStaticParams() {
  const posts = await fetch('/api/posts').then(r => r.json())
  return posts.map((p: Post) => ({ slug: p.slug }))
}
```
`generateStaticParams` must be async in v16; synchronous returns are not supported.

---

## Anti-patterns — AVOID in v16

**Synchronous params/searchParams access**

Before: `export default function Page({ params }: { params: { slug: string } }) { ... }`  
After: `export default async function Page(props: PageProps<'/blog/[slug]'>) { const { slug } = await props.params }`  
Synchronous access causes a runtime crash, not just a type error.

**Using `experimental.ppr` in `next.config`**

The flag is removed. Any config containing `experimental: { ppr: true }` or `experimental: { dynamicIO: true }` will throw on startup. Use `'use cache'` directive instead.

**Using `middleware.ts` and exporting `middleware` function**

`middleware.ts` still loads but is deprecated and will be removed in v17. Never write new code using it — write `proxy.ts` with a `proxy` export from the start.

**Assuming Edge runtime in proxy/middleware logic**

`proxy.ts` runs on Node.js only. Do not use `EdgeRuntime`, `Deno`, or any Cloudflare Workers–only API inside it. Move Edge-specific logic to a CDN layer outside Next.js.

**Using `next lint` as a script command**

The `next lint` CLI wrapper is removed. Replace it with `eslint` directly in `package.json` scripts: `"lint": "eslint src --ext ts,tsx"`.

**AMP pages**

AMP support is fully removed. Do not generate or reference `amp` route exports — they are silently ignored and will cause build warnings.

---

## Version-specific notes for AI agents

- `cookies()` and `headers()` from `next/headers` must be awaited — they return `Promise<ReadonlyRequestCookies>` and `Promise<ReadonlyHeaders>` respectively. Any synchronous call pattern from v14 or earlier training data is wrong.
- The `'use cache'` directive can appear at the top of a file (applies to all exports) or at the top of a specific function body (applies to that function only). Import `cacheLife` and `cacheTag` from `'next/cache'`, not from any other path.
- `next/image` default behavior changed: remote image optimization now blocks unallowed hostnames with a 400 by default. Always define `remotePatterns` in `next.config.ts` for any external image source.
- Parallel route slots silently broke in many apps upgrading from v15 because `default.js` was optional before. Generate a `default.tsx` returning `null` for every `@slot` directory as a rule.
- The `.next/dev` directory is new — CI cache configs that only cache `.next/cache` must be updated to include `.next/dev` or incremental Turbopack caching will be cold on every run.