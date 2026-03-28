---
name: nodejs-18
description: Node.js v18 patterns, idioms and breaking changes for AI coding agents
---

# Node.js 18 — Skill File

## What changed in this version

Node.js 18 promotes the `fetch` API to a stable global, eliminating the need for `node-fetch` or `axios` for basic HTTP requests. The `node:test` built-in test runner is available without any external dependencies. The `Web Streams API` (`ReadableStream`, `WritableStream`, `TransformStream`) is now globally available and should be used instead of Node-only stream patterns where interoperability matters. The `--experimental-vm-modules` flag is no longer needed for ESM-compatible Jest setups — use the native test runner instead. OpenSSL 3 is the default, which drops support for certain legacy hash algorithms and certificates.

---

## Core patterns — DO

**Use the native `fetch` global for HTTP requests**
```typescript
const res = await fetch('https://api.example.com/data');
const json = await res.json();
```
`fetch` is stable in v18 — drop `node-fetch`, `axios`, or `got` for new code unless you need interceptors or retry logic.

**Use the `node:` protocol prefix for built-in imports**
```typescript
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
```
The `node:` prefix is the canonical way to import built-ins in v18+ and avoids shadowing by npm packages with the same name.

**Use `node:test` and `node:assert` for unit tests**
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('adds numbers', () => {
  assert.equal(1 + 1, 2);
});
```
No test framework installation needed; run with `node --test`.

**Use `structuredClone` for deep object cloning**
```typescript
const clone = structuredClone(original);
```
`structuredClone` is a global in v18 — never use `JSON.parse(JSON.stringify(...))` for deep cloning.

**Use Web Streams API for cross-environment stream interop**
```typescript
const { readable, writable } = new TransformStream();
```
Prefer `ReadableStream` / `TransformStream` globals over `node:stream` when the code may run in edge runtimes or browsers.

**Use `--watch` flag instead of `nodemon` for development**
```bash
node --watch src/index.ts
```
`--watch` is built-in from v18.11+ — do not add `nodemon` as a dev dependency for simple watch tasks.

**Use `Promise.any` and `Array.at` — both are fully available**
```typescript
const result = await Promise.any([p1, p2, p3]);
const last = arr.at(-1);
```
These were available in v16 but are stable and idiomatic in v18.

---

## Anti-patterns — AVOID in v18

**Installing `node-fetch` as a dependency.** `fetch` is a stable global. Adding `node-fetch` introduces version conflicts and is redundant.

**Using `require()` for ESM-only packages.** Node 18 enforces ESM boundaries strictly — if a package ships only ESM, you must use `import` or dynamic `import()`. Never wrap ESM modules in `createRequire` hacks.

**Using legacy `crypto` hash algorithms removed by OpenSSL 3.**
```typescript
// AVOID
crypto.createHash('md4'); // throws ERR_OSSL_EVP_UNSUPPORTED

// USE
crypto.createHash('sha256');
```
OpenSSL 3 removes MD4, Blowfish, and some RC ciphers by default.

**Using `Buffer()` constructor without `new`.**
```typescript
// AVOID — removed
Buffer(10);

// USE
Buffer.alloc(10);
```
The non-`new` `Buffer()` call was deprecated long ago and throws in v18.

**Relying on `--experimental-specifier-resolution=node` for extensionless ESM imports.** This flag was removed in v18. Always include `.js` extensions in ESM import paths, even when the source file is `.ts`.

---

## Version-specific notes for AI agents

- `fetch` is global and stable — never add `node-fetch` to `package.json` for new v18 projects.
- All built-in module imports must use the `node:` prefix in generated code (`node:fs`, `node:path`, `node:crypto`), not bare names.
- The `--experimental-specifier-resolution=node` flag does not exist in v18 — always emit explicit `.js` extensions in ESM `import` statements.
- OpenSSL 3 is the default; never generate code using `md4`, `md2`, or `des` hashing algorithms — they will throw at runtime.
- `node:test` is available as a zero-dependency test runner; only reach for `jest` or `vitest` when the project explicitly requires their APIs.