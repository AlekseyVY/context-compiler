---
name: angular-20
description: Angular v20 patterns, idioms and breaking changes for AI coding agents
---

# Angular 20 — Skill File

## What changed in this version

Signal APIs (`effect()`, `toSignal()`, `toObservable()`, `linkedSignal()`, `afterEveryRender()`, `afterNextRender()`) are now **stable** — use them freely without developer-preview caveats. `afterRender()` was **renamed** to `afterEveryRender()` with no backward-compat alias and no auto-migration, so any existing call will break silently at runtime. Zoneless change detection graduated from experimental to developer preview and its provider was renamed from `provideExperimentalZonelessChangeDetection` to `provideZonelessChangeDetection`. The structural directives `*ngIf`, `*ngFor`, and `*ngSwitch` are now **officially deprecated** in favor of the built-in control-flow syntax (`@if`, `@for`, `@switch`). TypeScript 5.8+ and Node.js 20.11.1+ are now hard requirements.

---

## Core patterns — DO

**Use built-in control flow, never structural directives**
```html
@if (user()) { <app-profile [user]="user()" /> }
@for (item of items(); track item.id) { <li>{{ item.name }}</li> }
```
`*ngIf` and `*ngFor` are deprecated in v20 and will be removed in v22.

**Declare signals with stable APIs**
```ts
readonly count = signal(0);
readonly doubled = computed(() => this.count() * 2);
effect(() => console.log(this.count())); // stable, no forceRoot option
```
All three APIs are stable; `effect()` no longer accepts `forceRoot`.

**Use `afterEveryRender()` — not `afterRender()`**
```ts
afterEveryRender(() => this.chart.resize());
```
`afterRender` was renamed; the old name compiles but no longer exists at runtime.

**Import DOCUMENT from `@angular/core`, not `@angular/common`**
```ts
import { DOCUMENT } from '@angular/core'; // ✅
```
The token moved packages in v20; `ng update` migrates this automatically.

**Use inject() options object instead of InjectFlags**
```ts
readonly el = inject(ElementRef, { optional: true, host: true, skipSelf: true });
```
`InjectFlags` enum is removed; the options object is the only supported form.

**Use `provideZonelessChangeDetection()` for zoneless apps**
```ts
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()]
});
```
The old `provideExperimentalZonelessChangeDetection` identifier no longer exists.

**Use `TestBed.inject()` and `TestBed.tick()` in tests**
```ts
const svc = TestBed.inject(MyService);  // replaces removed TestBed.get()
TestBed.tick();                         // replaces deprecated flushEffects()
```
`TestBed.get()` is fully removed; `flushEffects()` is deprecated.

---

## Anti-patterns — AVOID in v20

**`afterRender()`** — renamed to `afterEveryRender()` with no compatibility shim; code will break.

**`*ngIf` / `*ngFor` / `*ngSwitch`** — officially deprecated; run `ng update` to auto-migrate to `@if`/`@for`/`@switch`.

**`provideExperimentalZonelessChangeDetection()`** — renamed; causes a compile error in v20.

**`TestBed.get()`** — removed since v20 (deprecated since v9); always use `TestBed.inject()`.

**`import { DOCUMENT } from '@angular/common'`** — moved to `@angular/core`; will throw at runtime.

**`@angular/platform-browser-dynamic`** — deprecated in v20; migrate imports to `@angular/platform-browser` manually, then remove the package dependency.

---

## Version-specific notes for AI agents

- `afterRender` does **not** exist in v20. Always emit `afterEveryRender`. No migration schematic was provided for this rename — it is a silent runtime break.
- Host bindings are now **fully type-checked**. Expressions in `host: {}` or `@HostBinding` must be type-safe, or the build fails. If generating host bindings, ensure types match exactly.
- Template expressions now accept `**` (exponentiation), tagged template literals, `void`, and `in`. These are valid v20 syntax and should be used when appropriate.
- `resource()` API: the `query` parameter was renamed to `params`; `rxResource()` `loader` was renamed to `stream`. The `reload()` method is only available on `WritableResource`, not the base `Resource`.
- `ng-reflect-*` attributes are **no longer emitted** in dev mode by default. Never write tests or selectors that target `ng-reflect-*` attributes — they will not exist unless `provideNgReflectAttributes()` is explicitly added.