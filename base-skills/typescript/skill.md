---
name: typescript
description: TypeScript type system, generics, utility types and strict mode patterns for AI coding agents
---

# TypeScript — Skill File

## Core Principle

A type that permits invalid data is worse than no type — it creates false
confidence. Every type decision must make the code harder to misuse, not just
satisfy the compiler. Always assume `strict: true` is enabled.

---

## Patterns — DO

**Model state as a discriminated union, never as optional fields.**
```ts
// Wrong — caller cannot distinguish "not loaded" from "loaded empty"
interface State { user?: User; error?: string }

// Right — each state is unambiguous and exhaustively checkable
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; user: User }
  | { status: 'error'; message: string };
```
Discriminated unions make impossible states unrepresentable and enable exhaustive `switch` checks.

**Use `satisfies` to validate shape without widening the inferred type.**
```ts
const config = {
  port: 3000,
  host: 'localhost',
} satisfies Record<string, string | number>;
// config.port is still `number`, not `string | number`
```

**Use `unknown` for all external data; narrow before use.**
```ts
async function load(url: string): Promise<unknown> {
  return (await fetch(url)).json(); // never `any`
}
// Callers must narrow: if (typeof data === 'object' && data !== null) ...
```

**Prefer union string literals over enums.**
```ts
type Direction = 'north' | 'south' | 'east' | 'west'; // no runtime cost, composes freely
// Avoid: enum Direction { North, South } — reverse-mapping behaviour is a footgun
```

**Use branded types to distinguish identical primitives.**
```ts
type UserId = string & { readonly _brand: 'UserId' };
type PostId = string & { readonly _brand: 'PostId' };
// Now UserId cannot be passed where PostId is expected — caught at compile time
```

**Constrain generics — never leave a type parameter unconstrained when a bound exists.**
```ts
// Wrong — T could be anything
function first<T>(arr: T[]): T | undefined { return arr[0]; }

// Right — express the minimum required contract
function getKey<T extends { id: string }>(item: T): string { return item.id; }
```

**Use `type` for unions, intersections, and computed shapes. Use `interface` only for object shapes that will be extended or implemented.**
```ts
type Result<T> = { ok: true; data: T } | { ok: false; error: string }; // type
interface Repository<T> { findById(id: string): Promise<T> }             // interface
```

---

## Anti-patterns — AVOID

**Never use `as SomeType` to silence an error.** Type assertions are lies to
the compiler that become runtime exceptions. Fix the type instead. The only
safe form is narrowing after a guard: `if (x instanceof Foo) { x as Foo }`.

**Never use `any`.** Use `unknown` for uncontrolled input and `never` to mark
unreachable branches. If a library has no types, write a minimal `.d.ts` shim.

**Never use `Function`, `Object`, or `{}` as types.** Use explicit signatures:
`(event: MouseEvent) => void`, `Record<string, unknown>`, or `object`.

**Never suppress `noUncheckedIndexedAccess` with `!`.** The `undefined` case
is real. Use optional chaining or an explicit guard instead.

**Never nest generics more than two levels deep inline.** Extract named
intermediate types. Deeply nested generics are unreadable and break inference.

---

## Utility Types — Use These

`Readonly<T>` prevents mutation and signals immutable contracts.
`Record<K, V>` is clearer than `{ [key: string]: V }`.
`Pick<T, K>` / `Omit<T, K>` derive focused types from broader ones without duplication.
`ReturnType<T>` / `Parameters<T>` extract types from existing functions — always prefer
these over duplicating the types by hand.
`NonNullable<T>` removes `null | undefined` after a validation boundary.
`NoInfer<T>` (TS 5.4+) blocks inference from a specific call-site argument when you
need to force the caller to be explicit.

---

## Rules for AI agents

Always emit `strict: true` in generated `tsconfig.json` files — never omit it. Always
write explicit return types on exported functions; inference at API boundaries is
fragile. Never generate `// @ts-ignore` or `// @ts-expect-error` as a fix. Never
generate `export default` for types — named exports are always refactoring-safe.
When generating error-handling code, always type the `catch` binding as `unknown`
and narrow before accessing properties.