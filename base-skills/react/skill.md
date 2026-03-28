---
name: react
description: React hooks, performance patterns and component model best practices
---

# React Best Practices

## Core Principles

React's model is: UI as a pure function of state. The closer your components
are to pure functions — same props in, same output, no side effects — the
more predictable, testable, and performant they are.

## Hooks

Every hook call must be at the top level of the component or custom hook.
Never call hooks inside conditions, loops, or nested functions — the order
of hook calls must be stable across renders.

Custom hooks are the primary mechanism for sharing stateful logic between
components. If the same `useState` + `useEffect` pattern appears in two
places, extract it into a custom hook.

Use `useReducer` over `useState` when state transitions are complex or when
the next state depends on multiple pieces of current state simultaneously.

## Performance

Wrap expensive calculations in `useMemo`. Wrap callback props in `useCallback`
when passing them to memoized child components — otherwise the child always
re-renders because the function reference changes every render.

Use `React.memo` for components that receive the same props frequently and
render expensive output. Do not memo everything — only where profiling shows
a real problem.

Prefer `key` based on stable unique IDs, never on array indices. Index-based
keys cause subtle bugs when lists are reordered, filtered, or spliced.

## Anti-patterns — AVOID

Never mutate state directly — always create new objects and arrays.
React uses reference equality to detect changes: mutation is invisible to it.

Never derive state from props by syncing them with `useEffect` — compute
derived values directly during render or with `useMemo`.

Avoid deeply nested component trees passing props through many levels.
Use Context or a state management solution instead of prop drilling
beyond 2-3 levels.