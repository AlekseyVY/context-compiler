---
name: nodejs-20
description: Node.js v20 patterns, idioms and breaking changes for AI coding agents
---

# Node.js 20 — Skill File

## What changed in this version

Node.js 20 promotes the built-in test runner (`node:test`) to stable, eliminating the need for Jest or Mocha in many projects. The `--experimental-vm-modules` flag is no longer needed for ESM in `vm` contexts. `import.meta.resolve()` is now synchronous and stable. The Web Crypto API is unflagged and fully available globally. Custom `CustomEvent` is now globally available without imports, matching the browser API surface.

---

## Core patterns — DO

**Use the built-in test runner for unit tests**
```typescript
import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

describe('math', () => {
  test('adds two numbers', () => {
    assert.equal(1 + 1, 2);
  });
});
```
`node:test` is stable in v20 — prefer it over third-party runners to avoid dependencies.

**Use `node:` prefix for all built-in imports**
```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import { EventEmitter } from 'node:events';
```
The `node:` prefix is now the canonical form; it makes built-ins unambiguous and slightly faster to resolve.

**Use `fs/promises` for all file I/O**
```typescript
const content = await fs.readFile('./data.json', 'utf8');
await fs.writeFile('./out.json', JSON.stringify(data));
```
Callback-based `fs` APIs should never be used in new code; the promise API is fully stable.

**Use `WebCrypto` globals directly**
```typescript
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);
```
`crypto` is a global in v20 — never import it from `node:crypto` for Web Crypto operations.

**Use `--env-file` flag instead of dotenv**
```bash
node --env-file=.env dist/server.js
```
Node 20 loads `.env` natively; do not add `dotenv` as a dependency for env loading.

**Use `import.meta.resolve()` synchronously**
```typescript
// Resolves a module path relative to the current file
const resolvedPath = import.meta.resolve('./config.json');
```
This is now stable and synchronous — no `await` needed, unlike earlier experimental versions.

**Use `AbortSignal.timeout()` for timed operations**
```typescript
const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
```
Always pass a timeout signal to `fetch` and other async APIs to prevent hanging requests.

---

## Anti-patterns — AVOID in v20

**Never use `require()` in new `.mjs` or ESM files.** CommonJS `require` is not available in ESM modules. Use `import` statements or dynamic `import()` instead.

**Never use `--experimental-fetch`.** The Fetch API is unflagged and globally available in v20. Passing this flag does nothing and signals outdated code.

**Avoid third-party `dotenv` for simple cases.** With `--env-file` now built in, adding `dotenv` purely for `.env` loading is unnecessary overhead.

**Avoid `new URL(path, import.meta.url)` for file resolution.** Use `import.meta.resolve()` instead, which is now synchronous, stable, and more readable.

**Never use `util.promisify` on `fs` functions.** `node:fs/promises` provides all async variants natively — `promisify` wrappers on `fs` are dead code.

---

## Version-specific notes for AI agents

- `node:test` is stable in v20. Never generate a `jest.config` or install `mocha` unless the project already uses them.
- `crypto` is a global. Never write `import crypto from 'node:crypto'` when the intent is Web Crypto (`crypto.subtle`). The `node:crypto` import gives the Node.js crypto module, not the Web Crypto API.
- The `--env-file` flag is available from v20.6+. Always check if the project targets an earlier patch before recommending it.
- `Array.fromAsync()` is available natively — never polyfill it or use a `for await` loop just to collect an async iterable into an array.
- `import.meta.resolve()` is synchronous in v20. Never wrap it in `await`; doing so silently returns a Promise in strict mode contexts.