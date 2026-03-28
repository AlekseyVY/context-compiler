---
name: nodejs
description: Node.js runtime patterns, async model, streams and error handling
---

# Node.js Best Practices

## Core Principles

Node.js is single-threaded with an async event loop. Every blocking operation
that is not offloaded to the thread pool or worker threads will freeze all
concurrent requests. The central discipline is: never block the event loop.

## Patterns — DO

**Always use `node:` prefix for built-in imports.** This makes it immediately
clear the import is a Node.js built-in, not an npm package, and is required
for correct behavior in some ESM contexts.
```typescript
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
```

**Prefer `fs/promises` over callback-based `fs`.**
Async/await over callbacks in all new code. Never mix the two styles.

**Use `AbortController` / `AbortSignal` for cancellable async operations.**
```typescript
const controller = new AbortController();
const data = await fetch(url, { signal: controller.signal });
// controller.abort() cancels the request cleanly
```

**Structure errors with cause chaining for debuggability.**
```typescript
try {
  await db.query(sql);
} catch (err) {
  throw new Error('Failed to load user', { cause: err });
}
```

**Use `AsyncLocalStorage` for request-scoped context** (logging correlation IDs,
auth context) instead of passing context through every function parameter.

**Validate all external input at the boundary** — HTTP request bodies, env
variables, file contents. Use a schema library like Zod at the entry point.
Internal functions should receive already-validated types.

## Anti-patterns — AVOID

Never use `process.exit()` inside library code or request handlers —
only at the top-level CLI entry point after cleanup.

Never do CPU-intensive work in the main thread (sorting large arrays,
image processing, crypto on large payloads) — offload to `worker_threads`.

Never swallow errors silently with empty `catch {}` blocks. At minimum,
log the error. Better — rethrow or convert to a typed error.

Never use `__dirname` and `__filename` in ESM modules — they do not exist.
Use `fileURLToPath(import.meta.url)` and `dirname()` from `node:path`.

Avoid synchronous `fs` methods (`readFileSync`, `writeFileSync`) in server
code — they block the event loop for all concurrent requests.

## Environment Variables

Always validate env variables at startup, not at point of use.
A missing `DATABASE_URL` should crash immediately with a clear message,
not fail silently on the first request three hours into a production run.
```typescript
const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}
```