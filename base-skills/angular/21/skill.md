---
name: angular-21
description: Angular v21 patterns, idioms and breaking changes for AI coding agents
---

# Angular 21 — Skill File

## What changed in this version

Zoneless change detection graduates from experimental to stable — applications no longer require Zone.js and must opt in explicitly if they still use it. The `resource()` and `rxResource()` APIs are stable, replacing most manual `HttpClient` + `subscribe()` flows in components. Signal-based forms (`FormField`, `FormGroup` backed by signals) replace the reactive-forms `FormControl` class for new code. All decorator-based input/output/query APIs (`@Input`, `@Output`, `@ViewChild`, etc.) are formally deprecated in favour of their signal counterparts introduced in v19.

---

## Core patterns — DO

**Use `input()` and `output()` for component API**
```typescript
readonly count = input<number>(0);           // required: input.required<number>()
readonly valueChange = output<number>();
```
Signal inputs are readonly signals; they compose with `computed()` and `effect()` without `ngOnChanges`.

**Use `viewChild()` / `contentChild()` for DOM queries**
```typescript
readonly canvas = viewChild.required<ElementRef>('canvas');
```
Returns a signal; access with `this.canvas()` instead of relying on lifecycle timing.

**Declare components fully standalone**
```typescript
@Component({ standalone: true, imports: [CommonModule, RouterOutlet], … })
```
Never generate or reference `NgModule`. All components, directives, and pipes must declare `standalone: true`.

**Use `inject()` instead of constructor injection**
```typescript
private readonly http = inject(HttpClient);
private readonly router = inject(Router);
```
Works in functional guards, resolvers, and factory functions. Never use constructor parameter injection for new code.

**Fetch async data with `resource()`**
```typescript
readonly user = resource({
  request: () => ({ id: this.userId() }),
  loader: ({ request }) => fetch(`/api/users/${request.id}`).then(r => r.json()),
});
// template: user.value(), user.isLoading(), user.error()
```
Replaces `ngOnInit` + `subscribe()` patterns for component-level data fetching.

**Use built-in control flow exclusively**
```typescript
@if (user.isLoading()) { <app-spinner /> }
@for (item of items(); track item.id) { <li>{{ item.name }}</li> }
@defer (on viewport) { <app-heavy-widget /> }
```
Never use `*ngIf`, `*ngFor`, or `*ngSwitch` structural directives.

---

## Anti-patterns — AVOID in v21

**`@Input()` / `@Output()` decorators** — deprecated. Use `input()` and `output()` signal functions instead.

**`@ViewChild` / `@ContentChild` decorators** — deprecated. Use `viewChild()` / `contentChild()` which return signals and are safe to read in `computed()`.

**`ngOnChanges`** — redundant with signal inputs. Use `effect(() => { this.count(); … })` or `computed()` to react to input changes.

**Zone.js in new projects** — do not add `zone.js` to `polyfills` in new apps. Bootstrapping must use `provideExperimentalZonelessChangeDetection()` (now stable, name may be `provideZonelessChangeDetection()`).

**NgModules** — never generate `@NgModule`. All APIs that required a module (`RouterModule.forRoot`, `HttpClientModule`) have standalone provider equivalents (`provideRouter`, `provideHttpClient`).

**Constructor parameter injection**
```typescript
// WRONG
constructor(private svc: MyService) {}
// CORRECT
private readonly svc = inject(MyService);
```

---

## Version-specific notes for AI agents

- `provideZonelessChangeDetection()` is the stable API name in v21; do not use the `Experimental` prefixed variant.
- `resource()` loader must return a `Promise`, not an `Observable`. Use `rxResource()` only when the source is an `Observable`.
- `linkedSignal()` is the correct primitive for writable derived state; never derive writable state with a plain `signal` + `effect` pair that writes back.
- Signal-based `FormField` requires import from `@angular/forms/signal` — it is a separate entry point from classic reactive forms.
- Always set `changeDetection: ChangeDetectionStrategy.OnPush` in every `@Component`. With zoneless this is the only strategy that works correctly; the default strategy is effectively a no-op without Zone.js.