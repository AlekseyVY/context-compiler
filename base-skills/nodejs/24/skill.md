---
name: nodejs-24
description: Node.js v24 patterns, idioms and breaking changes for AI coding agents
---

# Node.js 24 — Skill File

## What changed in this version

Node.js 24 (LTS "Krypton" as of October 2025) ships V8 13.6, which makes `Float16Array`, `RegExp.escape()`, and `Promise.try()` available without any import or flag. TypeScript type-stripping via `--experimental-strip-types` is now **stable**, meaning `.ts` files can be executed directly with `node` without a build step. `URLPattern` and `CloseEvent` are now globals — no import needed. `AsyncLocalStorage` silently switched its default implementation to `AsyncContextFrame`, which changes context-propagation timing in complex async trees. Several long-deprecated APIs (`tls.createSecurePair`, `url.parse`, `util.is*()`, `fs.truncate` with a file descriptor, `SlowBuffer`) are **removed** or emit runtime warnings.

---

## Core patterns — DO

**Use `URLPattern` as a global — no import**
```typescript
const pattern = new URLPattern({ pathname: '/users/:id' });
const match = pattern.exec('https://example.com/users/42');
console.log(match?.pathname.groups.id); // "42"
```
`URLPattern` is now in `globalThis`; importing it from any package produces a redundant shadow.

**Run TypeScript files directly with `node`**
```bash
node --experimental-strip-types server.ts
```
Type annotations are stripped at load time. Never transpile to JS first unless you need emitted declarations or down-level output.

**Use `node:test` without awaiting subtests**
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('user flow', (t) => {
  // No `await` needed — runner auto-awaits subtests in v24
  t.test('creates user', () => assert.ok(true));
  t.test('deletes user', () => assert.ok(true));
});
```
The runner now implicitly waits for all subtests; removing manual `await` eliminates flaky-test races.

**Use `Error.isError()` instead of `instanceof` across realms**
```typescript
// Works correctly across vm contexts and iframe boundaries
if (Error.isError(caught)) { /* ... */ }
```
`instanceof Error` breaks when the error originates from a different realm; `Error.isError()` does not.

**Use `RegExp.escape()` for dynamic patterns**
```typescript
const term = RegExp.escape(userInput); // escapes special chars
const re = new RegExp(term, 'gi');
```
Manual escaping with `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` is now unnecessary and error-prone.

**Use `Promise.try()` to unify sync-and-async error paths**
```typescript
const result = await Promise.try(() => JSON.parse(rawInput));
```
Wraps both thrown exceptions and rejected promises into a single `.catch()` chain, replacing a try/catch + Promise wrapper.

**Use WHATWG `URL` and `fetch` — they are stable globals**
```typescript
const url = new URL('/api/v1', 'https://example.com');
const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
```
Both are full globals. Do not import from `node:url` for construction or from third-party fetch polyfills.

---

## Anti-patterns — AVOID in 24

**`tls.createSecurePair()` — removed**
Use `tls.connect()` or `tls.createServer()` with the `secureContext` option instead. Calling `createSecurePair` throws at runtime.

**`url.parse()` — runtime deprecation warning**
```typescript
// ❌  url.parse('https://example.com/users?id=1')
// ✅  new URL('https://example.com/users?id=1')
```
`url.parse` emits a `DEP0169` runtime warning on every call. Migrate to the WHATWG `URL` constructor.

**`SlowBuffer` and raw `new Buffer()` — removed**
```typescript
// ❌  new Buffer(size)
// ✅  Buffer.alloc(size)   or   Buffer.allocUnsafe(size)
```
Both `SlowBuffer` and the `Buffer()` constructor throw. Always use the explicit factory methods.

**Zlib classes without `new` — runtime deprecation**
```typescript
// ❌  zlib.Gzip()
// ✅  new zlib.Gzip()
```
Omitting `new` emits a deprecation warning and will be removed in a future major.

**`fs.truncate(fd, len)` with a file descriptor — removed**
Pass a path string to `fs.truncate()` or use `fs.ftruncate(fd, len)` when you hold an open descriptor.

**Third-party `Blob`, `FormData`, or `AbortController` polyfills passed to `fetch`**
The `fetch` implementation in v24 explicitly rejects non-native instances of these types. Remove any polyfill that patches these globals and rely on the built-in versions.

---

## Version-specific notes for AI agents

- **TypeScript stripping is stable but limited.** `node --experimental-strip-types` handles type annotations and interfaces. It does **not** transform enums, decorators, or `namespace`. If the code uses those constructs, a full `tsc` or `tsx` compile step is still required.
- **AsyncContextFrame is the new default.** Code that depended on `async_hooks` ordering or patched `AsyncResource` internals may behave differently. The legacy behavior is recoverable via `--no-async-context-frame`, but treat that flag as a temporary escape hatch, not a solution.
- **OpenSSL 3.5 enforces stricter key lengths.** RSA/DSA/DH keys shorter than 2048 bits and ECC keys shorter than 224 bits are rejected at runtime. Do not generate or hard-code keys below these thresholds.
- **`dirent.path` is removed.** Use `dirent.parentPath` (added in v21.4) everywhere `dirent.path` was referenced.
- **`util.is*()` methods are removed.** Replace `util.isArray(x)` with `Array.isArray(x)`, `util.isRegExp(x)` with `x instanceof RegExp`, and so on for all `util.is*` predicates.