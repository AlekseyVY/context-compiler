---
name: nestjs-generic
description: NestJS modern patterns, idioms, and best practices for AI coding agents
---

# NestJS — Skill File

## What changed in recent versions

NestJS moved to a strongly module-scoped dependency injection model where every provider must be explicitly exported to be consumed outside its declaring module — implicit global availability is gone except via `@Global()`. The `HttpException` hierarchy was extended so agents must use typed exception subclasses rather than raw status codes. The `ConfigModule` with `forRoot({ validate })` is now the canonical way to handle environment variables, replacing ad-hoc `process.env` access. Interceptors, guards, and pipes are all expected to be injectable classes registered in the DI container, not plain functions.

---

## Core patterns — DO

**Use `@Module()` with explicit `exports` for cross-module providers**
```typescript
@Module({ providers: [UserService], exports: [UserService] })
export class UserModule {}
```
Without `exports`, `UserService` is invisible to importing modules — NestJS DI is strictly scoped.

**Inject config via `ConfigService`, never `process.env` directly**
```typescript
constructor(private config: ConfigService) {}
const port = this.config.get<number>('PORT');
```
`ConfigService` is type-safe, testable, and respects validation schemas defined in `ConfigModule`.

**Use typed exception classes from `@nestjs/common`**
```typescript
throw new NotFoundException(`User ${id} not found`);
throw new UnprocessableEntityException({ field: 'email', message: 'taken' });
```
Typed exceptions map automatically to correct HTTP status codes and integrate with exception filters.

**Declare guards, pipes, and interceptors as injectable providers**
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean { ... }
}
// Register at controller or globally via APP_GUARD token
```
This enables dependency injection inside guards (e.g., injecting `Reflector` or services).

**Use `APP_GUARD`, `APP_PIPE`, `APP_INTERCEPTOR` tokens for global registration**
```typescript
{ provide: APP_GUARD, useClass: JwtAuthGuard }
```
This is the only way to register global enhancers that still participate in DI — `app.useGlobalGuards()` does not.

**Validate all DTOs with `class-validator` + global `ValidationPipe`**
```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
```
`whitelist: true` strips unknown properties automatically; `forbidNonWhitelisted` throws on unexpected input.

**Use `forwardRef()` only to break circular dependencies, not as a default**
```typescript
@Inject(forwardRef(() => AuthService)) private auth: AuthService
```
Circular deps signal a design problem — refactor to a shared module if possible; use `forwardRef()` only as a last resort.

---

## Anti-patterns — AVOID

**Accessing `process.env` directly in services or controllers.** Always go through `ConfigService`. Direct `process.env` access bypasses validation and makes testing impossible without environment mutation.

**Registering global pipes/guards with `app.useGlobalPipes()` when the enhancer needs DI.** Methods on the `app` instance create instances outside the DI container, so injected dependencies will be undefined. Use `APP_PIPE` / `APP_GUARD` tokens instead.

**Throwing `new HttpException('message', 404)` with raw status codes.** Use `NotFoundException`, `BadRequestException`, etc. Raw status codes are error-prone and lose the structured response body that typed exceptions provide.

**Putting all providers in `AppModule`.** Every feature should live in its own feature module. A monolithic `AppModule` breaks lazy loading, makes testing slow, and hides dependency boundaries.

**Using `@Optional()` to silence missing provider errors.** If a dependency is truly required, a missing provider is a bug. `@Optional()` hides misconfiguration and leads to runtime `undefined` errors deeper in the call stack.

---

## Version-specific notes for AI agents

- Always generate a dedicated feature module (e.g., `UsersModule`) for every domain entity — never add feature providers directly to `AppModule`.
- `ValidationPipe` with `transform: true` coerces payload types (strings to numbers); always set this when route params or query params need to be numeric.
- `@Res()` in a controller method disables NestJS's automatic response handling — if you inject `@Res()`, you must call `res.json()` or `res.send()` manually. Prefer not injecting `@Res()` unless streaming or cookies are required.
- When generating interceptors that mutate the response, always use `map()` on the `Observable` returned by `next.handle()` — never `subscribe()`.
- `ConfigModule.forRoot({ isGlobal: true })` makes `ConfigService` available everywhere without re-importing `ConfigModule` in each feature module; always set `isGlobal: true` in app-level config setup.