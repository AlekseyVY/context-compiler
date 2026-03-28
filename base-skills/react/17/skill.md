---
name: react-17
description: React v17 patterns, idioms and breaking changes for AI coding agents
---

# React 17 — Skill File

## What changed in this version

React 17 changes the event delegation target from `document` to the root DOM container rendered by `ReactDOM.render()`. This means manual `document.addEventListener` listeners no longer interfere with React's synthetic event system. The JSX transform is updated so files no longer need `import React from 'react'` at the top of every JSX file — the runtime imports it automatically. `onScroll` no longer bubbles, matching browser behavior. `useEffect` cleanup timing is now always asynchronous, even when a component unmounts.

## Core patterns — DO

**Use the new JSX transform — omit the React import in JSX files**
```tsx
// No import needed for JSX to work
const Hello = () => <h1>Hello</h1>;
```
The new transform (`react/jsx-runtime`) handles the JSX factory automatically; adding `import React from 'react'` is harmless but redundant.

**Keep `useEffect` cleanup side-effect-free and async-safe**
```tsx
useEffect(() => {
  let active = true;
  fetchData().then(data => { if (active) setState(data); });
  return () => { active = false; }; // cleanup is always async in v17
}, []);
```
Cleanup now always runs asynchronously after paint on unmount — never assume synchronous teardown.

**Attach custom native event listeners to the React root, not `document`**
```tsx
const rootEl = document.getElementById('root');
rootEl.addEventListener('click', handler); // correct
document.addEventListener('click', handler); // will bypass React's delegation
```
React 17 delegates events to the root container, so native listeners on `document` may fire in the wrong order relative to React handlers.

**Use `ReactDOM.render` with a stable root element reference**
```tsx
ReactDOM.render(<App />, document.getElementById('root'));
```
React 18's `createRoot` does not exist in v17 — always use `ReactDOM.render`.

**Wrap multiple roots carefully when embedding React into non-React apps**
```tsx
ReactDOM.render(<Widget />, containerA);
ReactDOM.render(<Dashboard />, containerB);
```
Each root now has its own isolated event delegation, so multiple React roots on one page are safe in v17.

**Use `React.lazy` and `Suspense` for code splitting**
```tsx
const Chart = React.lazy(() => import('./Chart'));
const App = () => (
  <Suspense fallback={<Spinner />}>
    <Chart />
  </Suspense>
);
```
This is the canonical async component pattern in v17; no third-party lib required.

## Anti-patterns — AVOID in v17

**Relying on `onScroll` event bubbling.** `onScroll` no longer bubbles in v17 to match the native DOM spec. Attach scroll handlers directly to the scrollable element, not a parent.

**Expecting synchronous `useEffect` cleanup on unmount.** Before v17, cleanup could run synchronously. Code that depends on synchronous teardown (e.g., stopping a video before the next paint) will behave incorrectly — use refs or layout effects for synchronous work.

**Using `import React from 'react'` as a JSX requirement.** This is no longer necessary with the new transform and adds noise. Configure your tsconfig/babel with `"jsx": "react-jsx"` and remove the import from pure JSX files.

**Suppressing `react/react-in-jsx-scope` ESLint rule as a workaround.** The correct fix is to enable the new JSX transform in your build config, not to suppress the lint rule.

**Calling `e.persist()` on synthetic events.** React 17 removed event pooling entirely — synthetic events are never reused, so `e.persist()` is a no-op and should be deleted.

## Version-specific notes for AI agents

- Never generate `import React from 'react'` at the top of JSX files unless the file also uses a React API like `useState` or `useRef` directly. The new JSX transform makes it unnecessary.
- Never use `ReactDOM.createRoot` — it does not exist in v17. Always use `ReactDOM.render(element, container)`.
- Never call `e.persist()` — event pooling was removed; all synthetic event properties are accessible asynchronously without it.
- Always place `useEffect` cleanup logic assuming it runs asynchronously; never write cleanup that assumes it fires before the next render cycle begins.
- When generating tests, use `@testing-library/react` v12+ which aligns with React 17's event delegation model — older versions may produce incorrect event simulation results.