---
name: typescript-6
description: TypeScript v6 patterns, idioms and breaking changes for AI coding agents
---

# TypeScript 6 — Skill File

## What changed in this version

TypeScript 6.0 is a transition release — its primary purpose is to bridge 5.x codebases toward TypeScript 7.0, which will be a full compiler rewrite in Go. Nine compiler option defaults changed simultaneously, several legacy options were removed or deprecated, and `strict: true` is now on by default. Code that compiled cleanly under 5.x may surface new errors under 6.0, and those errors are real bugs that the old defaults were silently hiding. Import assertions using the `assert` keyword are deprecated in favour of `with`. The `moduleResolution: classic` strategy is gone entirely, and `esModuleInterop` can no longer be disabled.

---

## Core patterns — DO

**Use `import ... with` instead of `import ... assert`**
```ts
// Correct in TS 6
import data from "./data.json" with { type: "json" };
const mod = await import("./mod.js", { with: { type: "json" } });
```
The `assert` keyword on both static and dynamic imports is now deprecated and will be removed in TS 7.

**Use arrow functions in generic calls where parameter types need inference**
```ts
// Arrow functions: inference works in any property order
callIt({
  consume: y => y.toFixed(),   // y is correctly inferred as number
  produce: (x: number) => x * 2,
});
```
TS 6 improves inference for arrow functions in any property order; method shorthand syntax is still order-sensitive in some generic patterns.

**Set `rootDir` explicitly in every tsconfig.json**
```json
{ "compilerOptions": { "rootDir": "./src" } }
```
`rootDir` no longer auto-infers from the common ancestor of source files — it now defaults to the directory containing `tsconfig.json`. Omitting it will produce a TS error if your source tree is nested below the config file.

**Declare `@types` explicitly**
```json
{ "compilerOptions": { "types": ["node", "jest"] } }
```
`@types` packages are no longer auto-discovered from `node_modules`. Omitting `types` means no ambient type packages are included.

**Use `moduleResolution: bundler` or `nodenext`**
```json
{ "compilerOptions": { "moduleResolution": "bundler" } }
```
`classic` is gone and `node` is deprecated. All new projects must use `bundler` or `nodenext`.

**Use `es2025` as the compilation target**
```json
{ "compilerOptions": { "target": "es2025", "lib": ["es2025"] } }
```
TS 6 defaults to `es2025`. Built-in APIs like `Map.prototype.getOrInsert` and `Temporal` are now typed under stable `es2025` rather than unstable `esnext`.

**Add `--stableTypeOrdering` when migrating toward TS 7**
```json
{ "compilerOptions": { "stableTypeOrdering": true } }
```
This flag makes union type ordering in declaration emit match TS 7.0's Go-based compiler, reducing diff noise when validating the upgrade. Disable it for production builds (it adds up to 25% type-check overhead).

---

## Anti-patterns — AVOID in 6

**Setting `esModuleInterop: false` or `allowSyntheticDefaultImports: false`** — these flags can no longer be set to `false`. The safer interop behaviour is unconditional. Remove namespace-style CJS imports that relied on the old behaviour:
```ts
// Before (TS 5.x with esModuleInterop: false)
import * as express from "express";
// After
import express from "express";
```

**Relying on `strict` being off by default** — TS 6 enables `strict: true` automatically. Code with implicit `any`, unchecked nulls, or loose function types will now produce errors. Fix the real bugs; do not suppress them globally.

**Using `moduleResolution: classic` or `node`** — `classic` throws an error; `node` is deprecated and will not exist in TS 7. Migrate to `bundler` or `nodenext` immediately.

**Using `outFile`** — deprecated and will be removed in TS 7. Use a bundler (Vite, esbuild, Rollup) to concatenate output instead.

**Omitting `rootDir` when source files are deeper than the tsconfig** — the old implicit inference is gone. The compiler now errors with a precise diagnostic telling you the value to set; always set it explicitly.

**Using `import ... assert` syntax** — deprecated in both static and dynamic form. Always use `with` for import attributes.

---

## Version-specific notes for AI agents

- Never generate `tsconfig.json` without an explicit `rootDir` and explicit `types` array — both are now required for deterministic output.
- Never emit `moduleResolution: classic` or `moduleResolution: node` — only `bundler`, `nodenext`, or `node16` are valid non-deprecated values.
- Do not generate `esModuleInterop: false` or `allowSyntheticDefaultImports: false` — these are compile errors in TS 6.
- When generating generic object-literal arguments, prefer arrow function syntax over method shorthand for callbacks whose parameter types depend on sibling properties — inference is more reliable across all property orderings with arrow functions.
- `target: es5` and `outFile` are deprecated; never generate them for new projects. Treat any tsconfig using them as legacy code requiring migration.