---
name: typescript-6
description: TypeScript 6.0 specific changes, new defaults and deprecations
---

# TypeScript 6 — Version-Specific Notes

This file supplements the base TypeScript skill with changes specific to
TypeScript 6.0. Apply these rules IN ADDITION to base TypeScript practices.

## Breaking Changes That Affect Code Generation

**`strict: true` is now the default.** Do not suggest adding it to tsconfig —
it is already active. Do not suggest workarounds for errors that strict mode
catches — fix the type instead.

**`target` defaults to `ES2025`.** You can use all ES2025 features natively:
`Promise.withResolvers`, `Array.fromAsync`, `Object.groupBy`, `Map.groupBy`,
RegExp `v` flag, and the `Temporal` API (via types).

**`moduleResolution: node` is deprecated.** Always use `NodeNext` for Node.js
projects or `Bundler` for frontend projects with a bundler. Never suggest
the legacy `node` strategy.

**`types: []` is now the default** — global type packages are not auto-included.
If a project needs Node.js globals (`process`, `Buffer`, `__dirname`), the
tsconfig must explicitly include `"types": ["node"]`. When generating tsconfig
snippets, always include this for Node.js projects.

**`baseUrl` is deprecated.** Path aliases must be expressed through `paths`
without `baseUrl`. Never suggest `baseUrl` as a module resolution strategy.

## New Patterns Available in TS6

**`--stableTypeOrdering` flag** exists only for migration diagnostics between
TS6 and TS7. Never suggest it for production tsconfigs.

**Subpath imports via `#/`** are now first-class. For internal package aliases
prefer `imports` field in package.json over `paths` in tsconfig.