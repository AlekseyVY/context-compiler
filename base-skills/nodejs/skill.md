---
name: nodejs-generic
description: Node.js v(generic/LTS) patterns, idioms and best practices for AI coding agents
---

# Node.js Generic — Skill File

## What changed in this version

Modern Node.js (v18+) ships with a native `fetch` API, eliminating the need for `node-fetch` or `axios` for simple HTTP calls. The `--experimental-vm-modules` flag is now stable enough for ESM-aware test runners, and `node:` protocol imports are the canonical way to reference built-ins. `fs/promises`, `timers/promises`, and `readline/promises` are all stable and preferred over their callback counterparts. The `AsyncLocalStorage` API for request-scoped context (replacing continuation-local-storage) is production-ready.

---

## Core patterns — DO

**Use `node:` prefix for all built-in imports**
```typescript
import { readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
```
The `node:` prefix makes the import source unambiguous and prevents name collisions with npm packages.

**Prefer promise-based built-ins over callback APIs**
```typescript
const data = await readFile('./config.json', 'utf-8');
const parsed = JSON.parse(data);
```
`fs/promises`, `timers/promises`, and `stream/promises` are stable — callback wrappers like `util.promisify` are unnecessary for these modules.

**Use `AsyncLocalStorage` for request-scoped context**
```typescript
import { AsyncLocalStorage } from 'node:async_hooks';
export const requestContext = new AsyncLocalStorage<{ requestId: string }>();
// In middleware: requestContext.run({ requestId }, next);
// Anywhere downstream: requestContext.getStore()?.requestId
```
This replaces thread-local patterns and avoids prop-drilling context through every function call.

**Use native `fetch` for HTTP — no third-party shim needed**
```typescript
const res = await fetch('https://api.example.com/data');
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const json = await res.json();
```
Native fetch is available globally from Node 18+; importing `node-fetch` adds unnecessary weight.

**Stream large payloads with `stream/promises.pipeline`**
```typescript
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
await pipeline(createReadStream('input.csv'), transformStream, createWriteStream('output.csv'));
```
`pipeline` automatically cleans up all streams on error, preventing memory leaks.

**Use `import.meta.url` instead of `__dirname` in ESM**
```typescript
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, 'config.json');
```
`__dirname` is not defined in ESM modules; this is the canonical replacement.

**Use `structuredClone` for deep cloning**
```typescript
const copy = structuredClone(originalObject);
```
`structuredClone` is a global since Node 17 and handles circular references, Maps, Sets, and Dates correctly — unlike `JSON.parse(JSON.stringify(...))`.

---

## Anti-patterns — AVOID in generic

**Never use `require()` in `.mjs` files or projects with `"type": "module"`**
`require` is synchronous and unavailable in ESM context; always use `import`/dynamic `await import()`.

**Never use `util.promisify` on built-ins that already have promise APIs**
```typescript
// WRONG
import { promisify } from 'node:util';
import fs from 'node:fs';
const readFile = promisify(fs.readFile);

// RIGHT
import { readFile } from 'node:fs/promises';
```

**Never swallow `EventEmitter` errors by omitting an `'error'` listener**
An unhandled `error` event crashes the process; always attach `.on('error', handler)` or use `stream/promises.pipeline`.

**Never use `process.exit()` inside library code**
Calling `process.exit()` in a library prevents consumers from doing graceful shutdown; throw an error instead and let the application boundary decide.

**Never mix CJS `module.exports` with ESM `export` syntax in the same file**
Node does not allow this; pick one module system per file and keep it consistent across the project.

---

## Version-specific notes for AI agents

- Always check `package.json` for `"type": "module"` before choosing `require` vs `import`. Generating `require()` in an ESM project causes an immediate runtime crash.
- `__filename` and `__dirname` are **not** available in ESM. Always generate the `import.meta.url` + `fileURLToPath` replacement when path resolution is needed.
- Native `fetch` does **not** support Node.js `http.Agent` options (e.g., custom TLS certs, connection pooling). For those cases, generate `undici` with explicit dispatcher config, not `node-fetch`.
- `JSON.parse` and `JSON.stringify` do **not** handle `BigInt`. Generate explicit `.toString()` serialization or use a replacer function when BigInt values are present.
- When generating worker-thread code, always pass data via `workerData` and `postMessage` — never share mutable objects across threads without `SharedArrayBuffer` and `Atomics`.