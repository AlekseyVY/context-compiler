---
name: typescript-5
description: TypeScript v5 patterns, idioms and breaking changes for AI coding agents
---

# TypeScript 5 — Skill File

## What changed in this version

TypeScript 5 ships Stage 3 ECMAScript decorators as stable, replacing the old `experimentalDecorators` system with incompatible semantics — both can coexist but must not be mixed. The `const` modifier on type parameters lets callers receive literal/tuple types without casting. `--moduleResolution bundler` and `--verbatimModuleSyntax` are new required patterns for bundler-based projects. The `using` / `await using` declarations (Explicit Resource Management proposal) are now supported for deterministic cleanup. Several older `target` and `module` emit options are legacy and emit warnings.

---

## Core patterns — DO

**Use Stage 3 decorators without `experimentalDecorators`**
```ts
// tsconfig: "experimentalDecorators" must be absent or false
function log(target: unknown, ctx: ClassMethodDecoratorContext) { ... }
class Service { @log greet() {} }
```
Stage 3 decorators receive a `DecoratorContext` second argument; the old signature `(target, key, descriptor)` belongs to the legacy system.

**Use `const` type parameters for inferred literal types**
```ts
function identity<const T>(value: T): T { return value; }
const x = identity(["a", "b"]); // type: readonly ["a", "b"], not string[]
```
Without `const`, callers must assert `as const`; this moves that requirement to the definition site.

**Use `satisfies` to validate without widening**
```ts
const palette = { red: [255, 0, 0], blue: "#00f" } satisfies Record<string, string | number[]>;
palette.red.map(Boolean); // OK — type stays number[], not string | number[]
```
`satisfies` checks the shape but preserves the narrowest inferred type, unlike a direct annotation.

**Use `using` for deterministic resource cleanup**
```ts
function getFile(): Disposable { return { [Symbol.dispose]() { close(); } }; }
function process() { using file = getFile(); /* file.dispose() auto-called on scope exit */ }
```
Replace manual `try/finally` cleanup blocks with `using`; use `await using` for async resources.

**Use `--verbatimModuleSyntax` to enforce correct import kinds**
```ts
// Always write type-only imports explicitly
import type { User } from "./types";
import { createUser } from "./api"; // value import — kept in emit
```
This flag makes `import type` erasure behavior predictable and prevents runtime surprises from elided imports.

**Extend multiple tsconfig files as an array**
```json
{ "extends": ["./tsconfig.base.json", "./tsconfig.paths.json"] }
```
Single-string `extends` still works but can no longer compose multiple bases without this array form.

**Use `export type *` for re-exporting type-only namespaces**
```ts
export type * from "./models";
export type * as Models from "./models";
```
This is required when the consuming project uses `verbatimModuleSyntax` and the re-export is type-only.

---

## Anti-patterns — AVOID in TypeScript 5

**Mixing `experimentalDecorators` with Stage 3 decorators.** Enabling `experimentalDecorators: true` activates the legacy system globally; Stage 3 decorator libraries (e.g., `reflect-metadata`-free ones) will silently receive wrong arguments. Pick one system per project.

**Using `module: "node12"` or `moduleResolution: "node"` in bundler projects.** Use `--moduleResolution bundler` for Vite/esbuild/webpack projects; `node` resolution does not understand package `exports` conditions correctly.

**Writing `import { type Foo }` instead of `import type { Foo }` under `verbatimModuleSyntax`.** Inline `type` modifiers are allowed but the entire import must be `import type` if all bindings are types — otherwise the emit may retain an empty import.

**Targeting `ES3` or `ES5` with modern lib features.** TypeScript 5 emits a deprecation warning for `target: "ES3"`/`"ES5"`. Minimum viable target for new projects is `ES2016` or higher.

**Using the old decorator signature `(target, propertyKey, descriptor)` without `experimentalDecorators`.** Code written for legacy decorators will compile silently but receive a `ClassMethodDecoratorContext` object as the second argument, not a property key string — a runtime logic error.

---

## Version-specific notes for AI agents

- Never emit `experimentalDecorators: true` in a new tsconfig unless the project explicitly uses a legacy decorator library (e.g., TypeORM pre-v0.3, older `inversify`). Omitting the flag enables Stage 3 decorators automatically.
- `const` type parameters and `satisfies` are both TypeScript 5 features but `satisfies` shipped in 4.9 — do not guard its use behind a TS5 check.
- The `using` keyword requires `"lib": ["ES2022", "ESNext.Disposable"]` (or `"ESNext"`) in tsconfig; omitting it produces `Symbol.dispose does not exist` errors.
- `export type * from` syntax requires `"module": "ES2022"` or higher in tsconfig emit settings.
- All enums in TypeScript 5 are treated as union enums; code that relied on numeric enum assignability to `number` (e.g., `let n: number = MyEnum.A`) now errors under strict enum checking — always type the variable as the enum itself.