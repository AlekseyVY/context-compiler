---
name: javascript
description: Modern JavaScript ES2025+ patterns and best practices
---

# JavaScript (ES2025+) Best Practices

## Core Principles

Modern JavaScript projects that deliberately avoid TypeScript do so for
specific reasons — fast prototyping, scripting, or team preference. Respect
this decision. Never suggest adding TypeScript to a JavaScript project unless
explicitly asked.

## Patterns — DO

**Use `structuredClone` for deep object cloning.**
It is native, handles circular references, and works with all serializable types.
```javascript
const copy = structuredClone(original); // not JSON.parse(JSON.stringify(...))
```

**Use `Object.groupBy` and `Map.groupBy` for grouping (ES2024+).**
```javascript
const byStatus = Object.groupBy(users, user => user.status);
```

**Use `Promise.withResolvers` for externally-resolved promises (ES2024+).**
```javascript
const { promise, resolve, reject } = Promise.withResolvers();
```

**Use nullish coalescing `??` and optional chaining `?.` consistently.**
Never use `||` for default values when `0` or `''` are valid inputs.

**Use `Array.at(-1)` instead of `arr[arr.length - 1]`.**

## Anti-patterns — AVOID

Never use `var` — always `const` by default, `let` only when reassignment
is necessary. `var` has function scope and hoisting behavior that causes bugs.

Never use `arguments` object — use rest parameters `...args` instead.

Avoid `for...in` on arrays — it iterates prototype chain and gives string keys.
Use `for...of` or array methods.

Never mutate function arguments — create new values instead.
Mutation makes functions impure and harder to reason about.