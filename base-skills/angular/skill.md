---
name: angular-generic
description: Angular v17+ patterns, idioms and breaking changes for AI coding agents
---

# Angular (Modern) — Skill File

## What changed in this version

Angular 17+ introduced **standalone components as the default**, eliminating `NgModule` as a required building block. The new **signals-based reactivity model** (`signal()`, `computed()`, `effect()`) replaces direct RxJS-in-template patterns for synchronous state. Control flow syntax (`@if`, `@for`, `@switch`) replaced structural directives (`*ngIf`, `*ngFor`) in templates. The `inject()` function is now the preferred DI mechanism over constructor injection. The `HttpClient` must be provided via `provideHttpClient()` rather than `HttpClientModule`.

---

## Core patterns — DO

**Use standalone components always**
```typescript
@Component({ standalone: true, imports: [CommonModule], selector: 'app-foo', template: '' })
export class FooComponent {}
```
NgModule is optional and should only be used when integrating legacy libraries that require it.

**Bootstrap with `bootstrapApplication`**
```typescript
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient()]
});
```
This replaces `platformBrowserDynamic().bootstrapModule(AppModule)` in all new apps.

**Use signals for local and shared state**
```typescript
count = signal(0);
double = computed(() => this.count() * 2);
increment() { this.count.update(v => v + 1); }
```
Signals give fine-grained reactivity without zone.js change detection overhead.

**Use `inject()` for dependency injection**
```typescript
private http = inject(HttpClient);
private router = inject(Router);
```
`inject()` works in constructor context and in functional guards/resolvers, unlike constructor injection which cannot be used outside classes.

**Use new control flow syntax in templates**
```html
@if (user()) { <p>{{ user()!.name }}</p> }
@for (item of items(); track item.id) { <li>{{ item.label }}</li> }
```
The `@for` block requires a `track` expression — omitting it is a compile error.

**Use `input()` and `output()` signal-based APIs for component I/O**
```typescript
name = input.required<string>();
clicked = output<void>();
```
These replace `@Input()` / `@Output()` decorators and integrate directly with the signals graph.

**Use functional route guards**
```typescript
export const authGuard: CanActivateFn = () => inject(AuthService).isLoggedIn();
```
Class-based guards (`CanActivate`) are deprecated; functional guards are tree-shakeable and composable.

---

## Anti-patterns — AVOID in modern Angular

**Never use `NgModule` for new features.** Modules add indirection without benefit in standalone-first apps. Use `standalone: true` and import dependencies directly in the component.

**Never use `*ngIf` / `*ngFor` structural directives.** The `@if` / `@for` block syntax is the standard. Structural directives still work but will be flagged by lint rules and generate worse compiled output.

**Never use `BrowserModule` or `HttpClientModule` in providers.** Both are superseded: use `provideHttpClient()`, `provideAnimations()`, and `provideRouter()` in the application config.

**Never inject services via constructor parameters in new code.**
```typescript
// AVOID
constructor(private svc: MyService) {}
// DO
private svc = inject(MyService);
```
Constructor injection still works but `inject()` is the idiomatic approach and required for functional contexts.

**Never subscribe to `HttpClient` observables without handling errors in a `catchError`.** Unhandled HTTP errors cause silent failures in signal-based flows. Always pipe through `catchError` or use `toSignal` with an `initialValue`.

---

## Version-specific notes for AI agents

- `CommonModule` is still safe to import in standalone components for pipes like `AsyncPipe`, `DatePipe`, etc., but prefer importing individual pipes directly (e.g., `import { DatePipe }`) to keep bundles small.
- `toSignal()` from `@angular/core/rxjs-interop` converts an Observable to a signal and **must** be called in an injection context (constructor or field initializer), never inside a method.
- The `track` expression in `@for` is **mandatory** — generating `@for` without `track` will cause a template compile error.
- `signal()`, `computed()`, and `effect()` are imported from `@angular/core`, not a separate package.
- Do not use `ChangeDetectorRef.markForCheck()` or `detectChanges()` in components using signals — the signals graph handles change detection automatically; manual CD calls are a code smell indicating a missing signal.