---
name: angular-19
description: Angular v19 patterns, idioms and breaking changes for AI coding agents
---

# Angular 19 — Skill File

## What changed in this version

Signals API is now fully stable: `signal()`, `computed()`, `effect()`, `input()`, `output()`, `viewChild()`, and `contentChild()` are all production-ready and replace their Zone.js-based equivalents in new code. The `linkedSignal()` primitive is new in v19, enabling writable derived state. The `@let` template syntax for declaring local template variables is now stable. Standalone components are the default — `standalone: true` is no longer required in the decorator since it is implied. Route-level render mode control (SSR vs CSR per route) is stable.

## Core patterns — DO

**Use `input()` for component inputs, not `@Input()`**
```typescript
// ✅ v19
readonly userId = input.required<string>();
readonly label = input('default');
```
Signal inputs are reactive by default and integrate with `computed()` without manual subscriptions.

**Use `viewChild()` / `contentChild()` for queries, not `@ViewChild()`**
```typescript
readonly canvas = viewChild.required<ElementRef>('canvas');
```
Signal-based queries update synchronously and are type-safe without `!` assertions.

**Use `linkedSignal()` for writable derived state**
```typescript
readonly selectedId = linkedSignal(() => this.items()[0]?.id ?? null);
```
Use this when a signal should reset to a computed default but also be writable by the user.

**Use `inject()` instead of constructor injection**
```typescript
private readonly router = inject(Router);
private readonly http = inject(HttpClient);
```
`inject()` works in any injection context (factories, guards, interceptors) without constructor boilerplate.

**Use `effect()` for side-effects on signal changes**
```typescript
effect(() => { console.log('user changed:', this.user()); });
```
Never read signals inside `ngOnChanges` for reactive flows — `effect()` tracks them automatically.

**Declare standalone components without `standalone: true`**
```typescript
@Component({ selector: 'app-root', imports: [RouterOutlet], template: `<router-outlet/>` })
export class AppComponent {}
```
`standalone: true` is the implicit default in v19; omitting it produces the same result.

**Use `@let` for local template variables**
```html
@let user = currentUser$ | async;
<span>{{ user?.name }}</span>
```
Avoids nested `*ngIf="x as y"` hacks for template-scoped variable binding.

## Anti-patterns — AVOID in v19

**`@Input()` / `@Output()` decorators for new components.** Use `input()` and `output()` instead. Decorator-based I/O does not integrate with the signal graph.

**`@ViewChild()` / `@ContentChild()` decorators.** Replaced by `viewChild()` and `contentChild()` signal queries, which do not require `static` flags or lifecycle timing workarounds.

**`NgModule`-based architecture for new code.** Never generate `NgModule` files for new features; compose with standalone `imports` arrays instead.

**`Subject` + `takeUntilDestroyed` for reactive state.** If the source is internal component state, use `signal()` + `computed()`. Reserve RxJS for genuinely async or multi-event streams.

**Manual `ChangeDetectorRef.markForCheck()` in signal components.** Signal components using `ChangeDetectionStrategy.OnPush` re-render automatically when signals change; manual marking is redundant and misleading.

## Version-specific notes for AI agents

- `standalone: true` is now the default; never emit it in generated components, directives, or pipes unless explicitly targeting compatibility with v17 or earlier.
- `effect()` requires an injection context (constructor, field initializer, or `runInInjectionContext`). Never call it inside a lifecycle hook body.
- `input()` returns a `Signal<T>`, not `T` — always call it as a function (`this.label()`) inside class methods.
- `linkedSignal()` is writable via `.set()` / `.update()` but resets to its computed value when its dependencies change — do not use it as a plain `signal()` replacement.
- For SSR projects, set per-route render mode via `RenderMode.Client` or `RenderMode.Server` in the route config; do not use the old `TransferState` pattern as the primary hydration strategy.