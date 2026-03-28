---
name: react-generic
description: React v18+ patterns, idioms and breaking changes for AI coding agents
---

# React (Modern/Generic) — Skill File

## What changed in this version

React 18 introduced concurrent rendering as the default, meaning the scheduler can interrupt, pause, and resume renders — code that assumes synchronous rendering will break silently. The root API changed from `ReactDOM.render` to `createRoot`, and using the old API disables all concurrent features. Server Components (stable in React 19 via Next.js App Router) split the component tree into server-only and client-only subtrees, requiring explicit `"use client"` directives. The `useEffect` cleanup contract is now strictly enforced in Strict Mode via double-invocation, exposing bugs in effects that were previously hidden.

---

## Core patterns — DO

**Use `createRoot` for mounting**
```tsx
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')!).render(<App />);
```
The legacy `ReactDOM.render` silently opts out of all React 18+ concurrent features.

**Derive state with `useMemo`, never duplicate it**
```tsx
const filtered = useMemo(() => items.filter(i => i.active), [items]);
```
Storing derived values in `useState` causes stale-state bugs; compute them inline or memoize.

**Use `useId` for accessible element IDs**
```tsx
const id = useId();
return <><label htmlFor={id}>Name</label><input id={id} /></>;
```
`useId` generates IDs that are stable across server and client, preventing hydration mismatches.

**Lift expensive computation with `useDeferredValue`**
```tsx
const deferred = useDeferredValue(searchQuery);
// pass `deferred` to the slow child component
```
This lets React deprioritize re-rendering heavy subtrees without blocking user input.

**Mark intentional batched updates with `flushSync` only when DOM must be read immediately**
```tsx
import { flushSync } from 'react-dom';
flushSync(() => setState(next)); // forces synchronous flush
```
React 18 batches all updates by default; only break batching when you must measure the DOM right after a state change.

**Always return cleanup from `useEffect`**
```tsx
useEffect(() => {
  const sub = subscribe(id);
  return () => sub.unsubscribe(); // mandatory cleanup
}, [id]);
```
Strict Mode mounts effects twice in development; missing cleanup causes double-subscription bugs.

**Mark client-only components explicitly in App Router projects**
```tsx
"use client"; // must be the very first line
export function Counter() { ... }
```
Any component using hooks, browser APIs, or event handlers must carry this directive.

---

## Anti-patterns — AVOID

**`ReactDOM.render`** — Removed in React 19, disabled concurrent features in React 18. Always use `createRoot`.

**Mutating state directly** — `state.items.push(x)` skips re-renders. Always produce a new reference: `setItems(prev => [...prev, x])`.

**`useEffect` for data fetching without a framework** — Effects run after paint, causing waterfalls. Use React Query, SWR, or framework loaders (Next.js `fetch` in Server Components) instead.

**Using array index as `key` in dynamic lists** — `key={index}` breaks reconciliation when items are reordered or deleted. Always use a stable, unique business ID.

**Reading refs during render** — `ref.current` is `null` during the first render and mutating it in render body breaks concurrent mode. Read refs only inside effects or event handlers.

---

## Version-specific notes for AI agents

- React 18 batches state updates inside `setTimeout`, promises, and native event handlers — not just React event handlers. Never assume an update is flushed before the next line.
- `useEffect` runs **twice** on mount in Strict Mode (development only). Effects must be idempotent or have correct cleanup; generate code that satisfies this constraint always.
- Server Components cannot use hooks, context, or browser APIs. When generating components for Next.js App Router, default to Server Components and add `"use client"` only when hooks or interactivity are required.
- `use(promise)` (React 19) replaces the `useEffect`+`useState` data-fetching pattern inside components — do not generate the old pattern for projects explicitly on React 19.
- Never generate `componentWillMount`, `componentWillReceiveProps`, or `componentWillUpdate` — they are removed. Use `componentDidMount`/`useEffect` and `getDerivedStateFromProps` instead.