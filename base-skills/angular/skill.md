---
name: angular
description: Angular change detection, RxJS, DI and component architecture patterns
---

# Angular Best Practices

## Core Principles

Angular is an opinionated framework — follow its conventions rather than
fighting them. The framework's patterns (DI, RxJS, OnPush) exist for
scalability reasons that become apparent in large applications.

## Change Detection

Always use `ChangeDetectionStrategy.OnPush` for all components. Default
detection checks every component on every event — OnPush checks only when
inputs change, an event fires within the component, or an Observable emits
via the `async` pipe. This is a performance requirement, not an optimization.

Never call `detectChanges()` as a workaround for state management problems —
fix the state flow instead.

## RxJS and Subscriptions

Always unsubscribe from Observables in `ngOnDestroy`, or use the `async` pipe
which handles unsubscription automatically. Memory leaks from unmanaged
subscriptions are the most common Angular performance issue.

Prefer `async` pipe over manual subscription in templates. Manual subscriptions
in components require explicit cleanup and are error-prone.

Use `takeUntilDestroyed()` (Angular 16+) for declarative unsubscription
in component class bodies.

## Dependency Injection

Prefer `inject()` function over constructor injection in Angular 14+ projects.
It works in standalone components, directives, pipes, and services alike.

Use `providedIn: 'root'` for singleton services. Use component-level providers
only when the service must have separate instances per component tree.

## Anti-patterns — AVOID

Never use `any` in Angular templates — the template type checker cannot
protect you from runtime errors without accurate types.

Never subscribe inside another subscription — use higher-order operators
(`switchMap`, `mergeMap`, `concatMap`) instead.

Never mutate `@Input()` properties — treat them as readonly. Mutations are
not detected by OnPush and create confusing data flow.