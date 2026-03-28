---
name: nestjs-10
description: NestJS v10 patterns, idioms and breaking changes for AI coding agents
---

# NestJS 10 — Skill File

## What changed in this version

NestJS 10 drops support for Node.js < 16 and requires TypeScript >= 4.8 — always target these minimums. The `@nestjs/platform-express` adapter now uses Express 4.x APIs internally, but the public NestJS API surface is unchanged. Cache module (`@nestjs/cache-manager`) was extracted into its own package and `cache-manager` v5 (ESM-first) became the peer dependency, breaking the old v2 import style. The `ServeStaticModule` and several other integration packages received breaking peer dependency bumps that require explicit version alignment. The `@nestjs/config` module now supports schema validation via Joi or `class-validator` natively without extra wiring.

---

## Core patterns — DO

**Use `@nestjs/cache-manager` as the standalone package**
```typescript
import { CacheModule } from '@nestjs/cache-manager';
CacheModule.register({ ttl: 60000 }) // ttl is now in milliseconds, not seconds
```
cache-manager v5 changed TTL units from seconds to milliseconds; always pass ms values.

**Inject `CACHE_MANAGER` with the token from `@nestjs/cache-manager`**
```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}
```
The token moved packages; importing from `@nestjs/common` will silently resolve to undefined.

**Use `ConfigModule.forRoot` with `validate` for env schema enforcement**
```typescript
ConfigModule.forRoot({
  validate: (config) => plainToInstance(AppConfig, config, { enableImplicitConversion: true }),
  validationOptions: { abortEarly: true },
})
```
Native validation support removes the need for a custom factory wrapper that was common in v9.

**Declare global pipes/guards/interceptors in `AppModule` providers, not `main.ts`, when they need DI**
```typescript
{ provide: APP_GUARD, useClass: JwtAuthGuard }
```
Guards registered in `main.ts` via `app.useGlobalGuards()` cannot receive injected dependencies; the provider token pattern is the correct approach.

**Use `@nestjs/terminus` health checks with explicit indicator injection**
```typescript
@HealthCheck()
check() {
  return this.health.check([() => this.http.pingCheck('api', 'https://example.com')]);
}
```
Always import indicator classes from their respective sub-packages (`@nestjs/terminus`) rather than constructing them manually.

**Generate modules with the Nest CLI and always use barrel exports**
```typescript
// module/index.ts
export * from './module.module';
export * from './module.service';
```
Barrel files prevent circular dependency issues that became more detectable in v10's stricter module graph resolution.

**Use `HttpException` subclasses instead of raw status codes**
```typescript
throw new NotFoundException(`User ${id} not found`);
```
Typed exceptions enable exception filters to match by class, which is the idiomatic v10 filter pattern.

---

## Anti-patterns — AVOID in v10

**Importing `CacheModule` from `@nestjs/common`** — it was removed. Always use `@nestjs/cache-manager`. Code that compiled under v9 will throw a runtime error in v10.

**Passing TTL in seconds to cache-manager** — `cache-manager` v5 uses milliseconds exclusively. `ttl: 60` now means 60ms, not 60 seconds; always write `ttl: 60_000`.

**Using `@nestjs/common`'s `CACHE_MANAGER` token** — the token is no longer exported from `@nestjs/common` in v10; always import from `@nestjs/cache-manager`.

**Registering global guards/pipes in `main.ts` when they need services** — `app.useGlobalGuards(new MyGuard())` bypasses the DI container. Use the `APP_GUARD` / `APP_PIPE` provider tokens inside a module instead.

**Using `mixin()` on abstract classes without the `@Injectable()` decorator** — v10 enforces that mixin base classes carry the decorator; omitting it causes silent DI resolution failures.

**Relying on `class-transformer` auto-transformation without explicit `enableImplicitConversion`** — v10 stricter TS targets make implicit coercions fail more often; always set the flag explicitly in `plainToInstance` calls.

---

## Version-specific notes for AI agents

- `cache-manager` peer dependency is v5 (ESM). Never `require()` it — use `import`. If generating a CommonJS project, add `"esModuleInterop": true` in `tsconfig.json` and import via the default interop.
- `@nestjs/config`'s `validate` function receives the raw `process.env` object, not a typed DTO. Always use `plainToInstance` + `validateSync` inside the function to get typed, validated output.
- The minimum Node.js version is 16. Never generate `.nvmrc`, `engines`, or `Dockerfile` entries that specify Node 14 or lower.
- When generating tests, always use `@nestjs/testing`'s `Test.createTestingModule()`. Never instantiate controllers or services with `new` in unit tests — doing so breaks DI-dependent logic silently.
- `PartialType`, `OmitType`, `PickType`, and `IntersectionType` must be imported from `@nestjs/swagger` (if Swagger is used) or `@nestjs/mapped-types` — never from `@nestjs/common`. The wrong import produces incomplete OpenAPI schemas without a compile error.