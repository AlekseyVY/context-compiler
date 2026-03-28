---
name: angular-17
description: Angular v17 patterns, idioms and breaking changes for AI coding agents
---

# Angular 17 — Skill File

## What changed in this version

Angular 17 introduces a built-in control flow syntax (`@if`, `@for`, `@switch`) that replaces structural directives as the preferred templating approach. Deferrable views (`@defer`) are now a first-class feature for declarative lazy loading directly in templates. Signals (`signal()`, `computed()`, `effect()`) reach developer preview and are the intended reactivity primitive going forward. The `standalone: true` flag is now the default for all CLI-generated components, pipes, and directives — `NgModule` is no longer the default architecture. The Vite + esbuild pipeline replaces Webpack as the default builder, which changes how environment and build configurations are expressed.

---

## Core patterns — DO

**Use built-in control flow syntax in templates**
```html
@if (user()) {
  <p>Welcome, {{ user()!.name }}</p>
} @else {
  <p>Please log in.</p>
}
```
The new syntax is type-narrowed inside each branch and does not require importing `CommonModule` or `NgIf`.

**Use `@for` with a required `track` expression**
```html
@for (item of items(); track item.id) {
  <li>{{ item.name }}</li>
} @empty {
  <li>No items.</li>
}
```
`track` is mandatory (not optional like `trackBy`) and `@empty` replaces the common `*ngIf + *ngFor` workaround for empty states.

**Declare components as standalone by default**
```ts
@Component({
  selector: 'app-hero',
  standalone: true,           // default from CLI; always explicit
  imports: [RouterLink, AsyncPipe],
  templateUrl: './hero.component.html',
})
export class HeroComponent {}
```
Standalone components declare their own dependencies in `imports`, eliminating the need for a shared `NgModule`.

**Use Signals for local reactive state**
```ts
count = signal(0);
doubled = computed(() => this.count() * 2);

increment() { this.count.update(v => v + 1); }
```
Signals integrate with Angular's change detection without requiring `OnPush` or manual `markForCheck()` calls.

**Use `@defer` for declarative lazy loading**
```html
@defer (on viewport) {
  <app-heavy-chart />
} @placeholder {
  <div class="skeleton"></div>
} @loading (minimum 300ms) {
  <app-spinner />
}
```
`@defer` lazy-loads the component bundle automatically; no dynamic `import()` wiring is needed.

**Bootstrap with `bootstrapApplication` for standalone apps**
```ts
// main.ts
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient()],
});
```
Never use `platformBrowserDynamic().bootstrapModule(AppModule)` in new standalone projects.

**Provide services with `providedIn: 'root'` or functional providers**
```ts
// Tree-shakeable service
@Injectable({ providedIn: 'root' })
export class AuthService {}

// Functional route-level provider
{ path: 'admin', providers: [provideAdminFeature()], ... }
```

---

## Anti-patterns — AVOID in 17

**Using `*ngIf` / `*ngFor` / `*ngSwitch` in new code.** These structural directives are not removed but are superseded by the built-in control flow syntax. New templates must use `@if`, `@for`, `@switch`.

**Omitting `track` in `@for`.** Unlike `trackBy` in `*ngFor`, `track` is required. An `@for` block without `track` is a compile error.

**Generating or writing NgModule-based components.** The CLI no longer scaffolds `NgModule` by default. Do not wrap new features in a `FeatureModule` unless integrating with legacy module-based code.

**Using `BrowserModule` imports in standalone components.** `BrowserModule` must only appear once in `bootstrapApplication` providers. Import individual directives/pipes (`NgIf`, `AsyncPipe`, etc.) directly, or rely on the new control flow instead.

**Lazy-loading via `loadChildren` with module syntax for new routes.**
```ts
// AVOID
{ path: 'shop', loadChildren: () => import('./shop/shop.module').then(m => m.ShopModule) }

// PREFER
{ path: 'shop', loadComponent: () => import('./shop/shop.component').then(m => m.ShopComponent) }
```

**Using `ChangeDetectorRef.markForCheck()` to manage signal-based state.** Signals handle their own scheduling; mixing `markForCheck()` with `signal()`/`computed()` is redundant and can cause double-detection cycles.

---

## Version-specific notes for AI agents

- The CLI flag `--standalone` is now `true` by default. Never generate `NgModule` scaffolding unless the user explicitly targets a module-based project.
- `@for` without `track` is a **compile error**, not a warning. Always include `track item.<uniqueField>` or `track $index` as a fallback.
- `signal()`, `computed()`, and `effect()` are in **developer preview** in 17.0 — the API surface is stable enough to use but may have minor changes in 17.x patches. Do not use them in library public APIs.
- `@defer` triggers include `on idle`, `on viewport`, `on interaction`, `on hover`, `on immediate`, and `when <expr>`. Always choose the semantically correct trigger — do not default to `on idle` for everything.
- The new builder uses `application` (not `browser`) in `angular.json`. Generated `angular.json` files from v17 CLI will have `"builder": "@angular-devkit/build-angular:application"`. Do not revert to the old `browser` builder target when modifying build config.