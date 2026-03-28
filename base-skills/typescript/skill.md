---
name: typescript
description: TypeScript type system, generics, utility types and strict mode patterns
---

# TypeScript Best Practices

## Core Principles

TypeScript's value comes from making illegal states unrepresentable.
A type that allows invalid data is worse than no type at all — it creates
false confidence. Every type decision should make the code harder to misuse.

## Patterns — DO

**Prefer union types over enums for simple cases.**
Union types are erased at runtime and compose better with other types.
```typescript
// Prefer this
type Direction = 'north' | 'south' | 'east' | 'west';

// Over this — enums have runtime cost and behave unexpectedly with reverse mapping
enum Direction { North, South, East, West }
```

**Use `satisfies` operator to validate shape without widening the type.**
```typescript
const config = {
  port: 3000,
  host: 'localhost',
} satisfies Record<string, string | number>;
// config.port is still typed as number, not string | number
```

**Model absence explicitly — never rely on `undefined` leaking through.**
```typescript
// Wrong — caller cannot distinguish "not loaded" from "loaded but empty"
interface State { user?: User }

// Right — explicit states, no ambiguity
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; user: User }
  | { status: 'error'; message: string };
```

**Use `unknown` instead of `any` for values you don't control yet.**
`unknown` forces you to narrow before use. `any` silently disables type checking.
```typescript
// API responses, parsed JSON, external data
async function fetchData(url: string): Promise<unknown> {
  const res = await fetch(url);
  return res.json(); // unknown, not any
}
```

**Prefer `type` over `interface` for computed, union, and utility types.
Use `interface` only for object shapes that may be extended or implemented.**

## Anti-patterns — AVOID

Never use type assertions (`as SomeType`) to silence errors — fix the type instead.
Assertions are lies to the compiler that become runtime bugs.

Never use `Function` as a type — it accepts any function regardless of signature.
Use explicit `(param: Type) => ReturnType` instead.

Never ignore `noUncheckedIndexedAccess` violations with `!` — the `undefined`
case exists for a reason. Handle it explicitly.

Avoid deeply nested generic types. If a type needs more than 2-3 levels of
nesting to express, it should be decomposed into named intermediate types.

## Utility Types — Use These

`Readonly<T>` — prevents mutation, signals immutable data contracts.
`Record<K, V>` — prefer over `{ [key: string]: V }` for clarity.
`Pick<T, K>` / `Omit<T, K>` — derive focused types from broader ones.
`ReturnType<T>` / `Parameters<T>` — extract types from existing functions.
`NonNullable<T>` — remove null/undefined from a union after validation.