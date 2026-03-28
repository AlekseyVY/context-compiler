---
name: typescript-4
description: TypeScript v4 patterns, idioms and breaking changes for AI coding agents
---

# TypeScript 4 — Skill File

## What changed in this version

TypeScript 4.x introduced variadic tuple types, allowing tuples to spread and compose in ways that were previously impossible. Template literal types arrived as a first-class feature, enabling string manipulation at the type level. Class fields now align with the ECMAScript standard using `declare` for type-only declarations. The `unknown` type was promoted over `any` as the safe top type for values whose shape is not yet known.

---

## Core patterns — DO

**Variadic tuple types for composable argument lists**
```ts
type Concat<T extends unknown[], U extends unknown[]> = [...T, ...U];
type Result = Concat<[string, number], [boolean]>; // [string, number, boolean]
```
Variadic tuples replace hand-rolled overloads for functions that merge or wrap argument lists.

**Template literal types for string-keyed APIs**
```ts
type EventName<T extends string> = `on${Capitalize<T>}`;
type ClickEvent = EventName<"click">; // "onClick"
```
Use template literal types whenever you derive string union members from other string unions.

**`unknown` instead of `any` for untrusted input**
```ts
function parse(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("Expected string");
  return raw;
}
```
`unknown` forces a type guard before use; `any` silently disables all checks.

**`declare` for class field type annotations without emitted code**
```ts
class Widget {
  declare label: string; // no initializer emitted — matches ECMAScript class fields spec
}
```
Without `declare`, TypeScript 4 emits an initializer that can override a base-class accessor.

**Labeled tuple elements for readable signatures**
```ts
type Range = [start: number, end: number];
function slice(...[start, end]: Range) { /* … */ }
```
Labels appear in IDE tooltips and make positional types self-documenting.

**`infer` with extends constraints**
```ts
type FirstString<T> = T extends [infer Head extends string, ...unknown[]] ? Head : never;
```
Constrained `infer` (4.7+) eliminates the extra conditional you previously needed to narrow an inferred type.

**Short-circuit assignment operators**
```ts
user.name ??= "anonymous";
flags.verbose ||= false;
count &&= count - 1;
```
Prefer `??=`, `||=`, `&&=` over verbose `if`-assignments; they are native in TS 4.

---

## Anti-patterns — AVOID in 4

**Using `any` as a catch-clause type**
In TypeScript 4.0+, the default catch binding is `unknown`. Writing `catch (e: any)` opts back out of safety — use `catch (e) { if (e instanceof Error) … }` instead.

**Omitting `declare` on class fields that mirror a base accessor**
```ts
// WRONG — emits an initializer that silently shadows the base getter
class Child extends Base { title: string; }
// RIGHT
class Child extends Base { declare title: string; }
```

**Overloads where variadic tuples suffice**
Before TS 4, combining two typed arrays required many explicit overloads. Writing those overloads now is unnecessary verbosity; use `[...T, ...U]` spreads instead.

**`@ts-ignore` to suppress unknown-type errors**
Use `@ts-expect-error` instead — it fails compilation if the error disappears, making suppression comments self-auditing.

**String enums for string-union use cases**
Template literal types and `as const` objects produce narrower, more composable types than `enum`. Prefer `type Direction = "north" | "south"` over `enum Direction { North = "north" }`.

---

## Version-specific notes for AI agents

- **`useUnknownInCatchVariables`** is `true` by default under `strict` in TS 4.4+. Never generate `catch (e)` code that accesses `e.message` without a prior `instanceof` or `typeof` guard.
- **ECMAScript class fields** (`useDefineForClassFields`) defaults to `true` when `target` is `ES2022` or higher. Always emit `declare` for type-only property declarations in classes that extend another class.
- **Template literal types are not runtime constructs** — never attempt to call or evaluate them; they exist purely at the type level.
- **Variadic tuple rest elements must be last**, except that a single rest may appear in a non-terminal position when all surrounding elements are concrete. Generate tuples that respect this constraint or TypeScript will error.
- **`noPropertyAccessFromIndexSignature`** (4.2) requires bracket notation for index-signature keys. When this flag is enabled, never generate `obj.dynamicKey` — always generate `obj["dynamicKey"]`.