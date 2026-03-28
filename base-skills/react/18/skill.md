---
name: react-18
description: React v18 patterns, idioms and breaking changes for AI coding agents
---

# React 18 — Skill File

## What changed in this version

React 18 replaces the legacy synchronous rendering pipeline with a concurrent renderer. The root mounting API changed: `ReactDOM.render` is removed in favor of `createRoot`. Automatic batching now applies to ALL state updates — including those inside `setTimeout`, Promises, and native event handlers — not just React synthetic events. Two new hooks (`useId`, `useTransition`, `useDeferredValue`) enable concurrent UI patterns. Strict Mode now double-invokes effects in development to surface side-effect bugs.

## Core patterns — DO

**Use `createRoot` to mount the app**
```tsx
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')!).render(<App />);
```
`ReactDOM.render` is removed; all concurrent features require the new root API.

**Mark non-urgent state updates with `useTransition`**
```tsx
const [isPending, startTransition] = useTransition();
startTransition(() => setSearchQuery(input)); // won't block typing
```
Wrapping low-priority updates prevents them from blocking urgent UI like keystrokes.

**Generate stable, SSR-safe IDs with `useId`**
```tsx
const id = useId(); // e.g. ":r1:"
return <label htmlFor={id}>Name<input id={id} /></label>;
```
Never use `Math.random()` or an incrementing module counter for element IDs — `useId` is hydration-safe.

**Defer expensive derived values with `useDeferredValue`**
```tsx
const deferred = useDeferredValue(expensiveList);
return <HeavyList items={deferred} />;
```
Use instead of manual debouncing when you want React to deprioritize a render automatically.

**Wrap async-loading components in `<Suspense>`**
```tsx
<Suspense fallback={<Spinner />}>
  <LazyComponent />
</Suspense>
```
Suspense is now supported on the server via streaming (`renderToPipeableStream`), so always provide a fallback.

**Use `flushSync` only when you need synchronous DOM reads immediately after state**
```tsx
import { flushSync } from 'react-dom';
flushSync(() => setState(next)); // DOM is updated before next line
```
Reserve for scroll-position or focus management after state; never use it as a default.

## Anti-patterns — AVOID in React 18

**`ReactDOM.render` / `ReactDOM.hydrate`** — Both APIs are removed. Always use `createRoot` and `hydrateRoot` respectively.

**Relying on per-event batching behavior** — In React 17, updates inside `setTimeout` were NOT batched. Code written to work around that (splitting updates into microtasks) is now wrong; React 18 batches everything automatically.

**Using index as key in transitioning lists** — Concurrent rendering may pause and resume renders; index keys cause mismatched reconciliation. Always use a stable, unique ID.

**Running side effects directly in the render function** — Strict Mode double-invokes renders AND effects in development. Any effect that doesn't clean up will fire twice, exposing bugs. Always return a cleanup function from `useEffect`.

**`ReactDOM.unstable_batchedUpdates`** — This workaround for manual batching is obsolete; automatic batching covers all cases. Remove it.

## Version-specific notes for AI agents

- `createRoot` is required — never emit `ReactDOM.render(...)` for React 18 targets; it will throw a warning and is a no-op in strict mode.
- Automatic batching changes observable behavior: two `setState` calls inside a `fetch().then()` callback now produce ONE render, not two. Tests that assert render count must account for this.
- `useEffect` runs twice in development under Strict Mode by design — never "fix" this by removing the Strict Mode wrapper; fix it by writing idempotent effects with proper cleanup.
- `useDeferredValue` and `useTransition` require the concurrent renderer (`createRoot`); they silently degrade to synchronous behavior if used with the legacy root — always use `createRoot`.
- Server components (RSC) are NOT part of React 18 itself — they are a framework-level feature (Next.js App Router). Do not emit `"use client"` / `"use server"` directives unless the target is explicitly an RSC-capable framework.