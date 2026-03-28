---
name: nodejs-22
description: Node.js v22 patterns, idioms and breaking changes for AI coding agents
---

# Node.js 22 — Skill File

## What changed in this version

Node.js 22 ships `require()` support for synchronous ES modules (stable from 22.12), eliminating the need for dynamic `import()` workarounds in CommonJS code. The built-in `WebSocket` client is now stable and globally available without any polyfill. `import.meta.dirname` and `import.meta.filename` are available in ESM, replacing the `fileURLToPath(import.meta.url)` workaround for `__dirname`. The `node:fs` module now exposes `glob` and `globSync` natively. Experimental TypeScript stripping (`--experimental-strip-types`) allows running `.ts` files directly without a build step.

---

## Core patterns — DO

**Use `import.meta.dirname` in ESM instead of URL hacks**
```ts
// ✅ v22+
const config = path.join(import.meta.dirname, 'config.json');
```
`import.meta.dirname` is now a first-class string in ESM — no `fileURLToPath` needed.

**Use the global `WebSocket` client directly**
```ts
const ws = new WebSocket('wss://example.com/socket');
ws.addEventListener('message', (e) => console.log(e.data));
```
`WebSocket` is globally available; never import a third-party polyfill for Node.js 22 targets.

**Use `node:fs` native glob instead of third-party glob libraries**
```ts
import { glob } from 'node:fs/promises';
const files = await glob('src/**/*.ts');
```
Eliminates the `glob` or `fast-glob` dependency for standard file discovery.

**Use `Promise.withResolvers()` for deferred promises**
```ts
const { promise, resolve, reject } = Promise.withResolvers<string>();
```
This V8-native pattern replaces the manual `let resolve!: ...; const p = new Promise(r => resolve = r)` anti-pattern.

**Use `node:sqlite` for embedded SQLite (experimental)**
```ts
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(':memory:');
```
Always guard with `--experimental-sqlite` flag; do not use in production without awareness of API stability.

**Use `--watch` for dev reloads instead of nodemon**
```json
{ "scripts": { "dev": "node --watch src/index.ts" } }
```
`--watch` is stable in v22; remove `nodemon` as a dev dependency for new projects.

**Use `Array.fromAsync()` to collect async iterables**
```ts
const lines = await Array.fromAsync(fs.createReadStream('file.txt'));
```
Prefer over manual `for await...of` accumulation loops.

---

## Anti-patterns — AVOID in 22

**Avoid `__dirname` / `__filename` in new ESM files.** Use `import.meta.dirname` and `import.meta.filename` instead; the legacy globals do not exist in ESM scope.

**Avoid `fileURLToPath(import.meta.url)` for directory resolution.** This was the v18/v20 workaround — `import.meta.dirname` makes it obsolete.

**Avoid importing `ws` or `isomorphic-ws` for Node.js-only WebSocket code.** The global `WebSocket` is stable; third-party packages add unnecessary weight.

**Avoid `glob` npm package as a direct dependency in new projects.** `node:fs/promises` `glob` covers the standard use case natively.

**Avoid `new Promise((res, rej) => { resolve = res })` deferred pattern.** `Promise.withResolvers()` is the canonical replacement and is type-safe.

---

## Version-specific notes for AI agents

- `require()` of ESM works only for **synchronous** ES modules (no top-level `await`). Generating `require()` of async ESM will throw at runtime.
- `--experimental-strip-types` strips TypeScript syntax but does **not** type-check. Never omit a separate `tsc --noEmit` step when using it.
- `node:sqlite` requires the `--experimental-sqlite` CLI flag; generated code must include it or document it — silently omitting it causes a module-not-found error.
- `import.meta.dirname` is `undefined` in CommonJS files; only use it inside `.mjs` files or `.js` files under `"type": "module"` packages.
- The `navigator` global object is available (for `navigator.hardwareConcurrency` etc.), but `navigator.userAgent` returns `"Node.js"` — never branch on it for browser detection.