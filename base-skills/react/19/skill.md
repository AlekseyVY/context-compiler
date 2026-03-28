---
name: react-19
description: React v19 patterns, idioms and breaking changes for AI coding agents
---

# React 19 — Skill File

## What changed in this version

React 19 introduces Actions as the canonical way to handle async mutations, replacing manual `useState` + `useEffect` loading/error patterns. The new `use()` hook allows reading promises and context inside render, including conditionally. `ref` is now a plain prop on function components — `forwardRef` is no longer needed. The compiler (React Compiler / Forget) is production-ready and handles memoization automatically, making manual `useMemo`/`useCallback` wrapping unnecessary in most cases. Server Components and the `"use client"` / `"use server"` directives are now stable parts of the core model.

---

## Core patterns — DO

**Use `useActionState` for async form mutations**
```tsx
const [state, submitAction, isPending] = useActionState(async (prev, formData) => {
  return await saveUser(formData);
}, null);
```
This replaces the `useState` + manual loading flag pattern; `isPending` is derived automatically.

**Use `useOptimistic` for instant UI feedback**
```tsx
const [optimisticItems, addOptimistic] = useOptimistic(items, (state, newItem) => [...state, newItem]);
```
Call `addOptimistic` inside an Action before the async call resolves; React rolls back on failure.

**Pass `ref` as a plain prop on function components**
```tsx
function Input({ ref, ...props }: React.ComponentProps<'input'>) {
  return <input ref={ref} {...props} />;
}
```
`forwardRef` is removed in 19 — `ref` is just a prop now.

**Use `use()` to read promises in render**
```tsx
const data = use(fetchUserPromise); // suspends until resolved
const theme = use(ThemeContext);    // replaces useContext, works conditionally
```
`use()` is the only hook that can be called inside conditionals and loops.

**Use `<form action={asyncFn}>` for declarative submissions**
```tsx
<form action={async (formData) => { await submitData(formData); }}>
  <button type="submit">Save</button>
</form>
```
React resets the form and manages pending state automatically when `action` is an async function.

**Use `useFormStatus` inside form children**
```tsx
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>Submit</button>;
}
```
This reads the parent `<form>`'s pending state without prop drilling.

---

## Anti-patterns — AVOID in 19

**Wrapping components in `forwardRef`** — it is deprecated and will be removed. Declare `ref` as a plain destructured prop instead.

**Manual `useMemo` / `useCallback` for performance** — the React Compiler memoizes automatically. Adding these manually creates noise and can conflict with compiler output. Only use them for referential identity contracts (e.g., dependency arrays in external hooks you don't control).

**`ReactDOM.render()` or `ReactDOM.hydrate()`** — both are fully removed. Always use `createRoot` and `hydrateRoot` from `react-dom/client`.

**`defaultProps` on function components** — removed. Use ES default parameter syntax: `function Button({ color = 'blue' })`.

**Reading `ref.current` during render to pass data** — use `use()` + context or props instead. Refs are escape hatches, not data channels.

---

## Version-specific notes for AI agents

- Never emit `forwardRef` — it is a hard deprecation. `ref` is a normal prop; destructure it directly in the function signature.
- `useActionState` lives in `react`, not `react-dom`. Import from `'react'`, not `'react-dom'`.
- `useFormStatus` must be inside a *descendant* of the `<form>` element — it cannot read a sibling or parent form's state.
- Do not generate `propTypes` — the `prop-types` package is no longer maintained by the React team and has no place in new React 19 code. Use TypeScript types.
- When generating Server Components, never import client-only APIs (hooks, browser globals). When generating Client Components, always add `"use client"` as the very first line — before imports.