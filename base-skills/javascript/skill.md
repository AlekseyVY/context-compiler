---
name: javascript-generic
description: JavaScript (modern/generic) patterns, idioms and best practices for AI coding agents
---

# JavaScript (Generic Modern) — Skill File

## What changed in this version

Modern JavaScript (ES2020+) stabilized several long-awaited features that change how code should be structured. Optional chaining (`?.`) and nullish coalescing (`??`) replace verbose null-guard chains. Top-level `await` is available in ES modules, removing the need for IIFE async wrappers. `Promise.allSettled`, `Promise.any`, and structured `error.cause` change how multi-promise flows and error chains are expressed. Logical assignment operators (`&&=`, `||=`, `??=`) replace common conditional assignment patterns.

---

## Core patterns — DO

**Use optional chaining for nested property access**
```js
const city = user?.address?.city ?? 'Unknown';
```
Eliminates manual null checks at every level; crashes are replaced with a clean `undefined` fallback.

**Use nullish coalescing, not `||`, for default values**
```js
const timeout = config.timeout ?? 3000; // 0 is preserved; || would replace it
```
`||` incorrectly treats `0`, `''`, and `false` as falsy — `??` only triggers on `null`/`undefined`.

**Use `Promise.allSettled` when all results matter**
```js
const results = await Promise.allSettled([fetchA(), fetchB()]);
results.forEach(r => r.status === 'fulfilled' ? use(r.value) : log(r.reason));
```
`Promise.all` short-circuits on the first rejection; use `allSettled` when partial success is valid.

**Propagate error context with `cause`**
```js
throw new Error('DB query failed', { cause: originalError });
```
Preserves the original stack trace without string concatenation, and is readable by `error.cause`.

**Use logical assignment for conditional mutation**
```js
config.retries ??= 3;   // assign only if null/undefined
settings.debug ||= false; // assign only if falsy
```
Replaces the `if (!x) x = y` pattern with a single declarative line.

**Use `structuredClone` for deep copies**
```js
const copy = structuredClone(original);
```
Replaces `JSON.parse(JSON.stringify(...))` — handles `Date`, `Map`, `Set`, circular refs.

**Use `Array.at()` for negative indexing**
```js
const last = arr.at(-1); // replaces arr[arr.length - 1]
```
Cleaner, less error-prone, and semantically explicit about intent.

---

## Anti-patterns — AVOID

**`var` for any declaration.** Use `const` by default, `let` only when reassignment is needed. `var` has function scope and hoisting behavior that produces subtle bugs.

**`== ` (loose equality).** Always use `===`. Loose equality coerces types silently — `0 == ''` is `true`.

**Mutating function arguments directly.**
```js
// WRONG
function setName(user) { user.name = 'X'; }
// RIGHT
function setName(user) { return { ...user, name: 'X' }; }
```
Mutation of passed objects causes invisible side effects across call sites.

**`arguments` object inside functions.** Use rest parameters instead: `function fn(...args)`. `arguments` is not available in arrow functions and has no array methods.

**Floating `async` without error handling.** Never call an async function without either `await` or `.catch()`. Unhandled promise rejections silently fail in most runtimes.

**`for...in` on arrays.** Use `for...of` or `forEach`. `for...in` iterates enumerable string keys, including prototype properties, which produces unexpected results on arrays.

---

## Version-specific notes for AI agents

- `?.` and `??` require Node ≥ 14 or a transpiler targeting ES2020+; never use them in code that must support IE11 or very old Node without a build step.
- Top-level `await` only works inside ES modules (files with `"type": "module"` in `package.json` or `.mjs` extension); never emit it in CommonJS files.
- `structuredClone` is available natively in Node ≥ 17 and modern browsers; add a polyfill or use `lodash.cloneDeep` for older targets.
- `Array.at()` is ES2022 — confirm target environment before using it in library code without a polyfill.
- `error.cause` is ES2022; when generating error-handling code for broad compatibility, include a fallback: `throw Object.assign(new Error(msg), { cause: err })`.