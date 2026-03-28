---
name: nestjs-9
description: NestJS v9 patterns, idioms and breaking changes for AI coding agents
---

# NestJS 9 — Skill File

## What changed in this version

NestJS 9 introduces **REPL (Read-Eval-Print Loop)** mode for interactively exploring the dependency injection container. The `ConfigModule` now supports `validate` with `joi` or `class-validator` schemas directly. `@nestjs/axios` replaces the deprecated `HttpModule` from `@nestjs/common` — all HTTP client code must migrate to it. Interceptors, guards, and pipes now support `inject`-able dependencies via `APP_INTERCEPTOR`, `APP_GUARD`, and `APP_PIPE` global tokens more reliably. The `ModuleRef` API gains `introspect()` for runtime DI inspection.

---

## Core patterns — DO

**Use `@nestjs/axios` for HTTP calls — never `HttpModule` from `@nestjs/common`**
```typescript
import { HttpModule } from '@nestjs/axios';
@Module({ imports: [HttpModule] })
```
`HttpModule` was moved out of `@nestjs/common` in v9; importing from the old path throws a module-not-found error.

**Always use `ConfigModule.forRoot` with `validate` for env validation**
```typescript
ConfigModule.forRoot({
  validate: (config) => plainToInstance(AppConfig, config, { enableImplicitConversion: true }),
  validationOptions: { abortEarly: true },
});
```
This replaces ad-hoc `process.env` access and gives typed, validated config throughout the app.

**Register global guards/pipes/interceptors via DI tokens, not `useGlobalGuards`**
```typescript
{ provide: APP_GUARD, useClass: JwtAuthGuard },
{ provide: APP_PIPE,  useClass: ValidationPipe  },
```
Token-based registration allows the guard/pipe to receive injected services; `useGlobalGuards()` does not.

**Use `ModuleRef.create()` for transient instances outside the DI lifecycle**
```typescript
const instance = await this.moduleRef.create(MyTransientService);
```
This is the v9-endorsed way to instantiate transient-scoped providers on demand without hacking the container.

**Use REPL mode (`nest start --entryFile repl`) for DI debugging — never `console.log` the container**
```typescript
// repl.ts
import { repl } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap() { await repl(AppModule); }
bootstrap();
```
REPL lets the agent (or developer) call `get(ServiceName)` interactively to inspect the live container.

**Declare `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` globally**
```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
```
Without `whitelist`, extra properties silently pass through DTOs — a security risk in every version, but v9 makes the global pipe injection reliable enough to enforce this everywhere.

**Use `@InjectRepository` with the `TypeORM` datasource pattern from v0.3+**
```typescript
TypeOrmModule.forFeature([UserEntity])
// then in service:
constructor(@InjectRepository(UserEntity) private repo: Repository<UserEntity>) {}
```
NestJS 9 targets TypeORM 0.3.x; the old `Connection` class is removed — use `DataSource` instead.

---

## Anti-patterns — AVOID in 9

**`HttpModule` from `@nestjs/common`** — it was removed. Always import from `@nestjs/axios`.

**`app.useGlobalGuards(new MyGuard())`** — instantiating guards manually prevents DI injection inside the guard. Use `APP_GUARD` token in a module provider instead.

**`Connection` from TypeORM** — TypeORM 0.3 (required by NestJS 9) removed `Connection`. Replace every occurrence with `DataSource`.
```typescript
// WRONG
constructor(private connection: Connection) {}
// RIGHT
constructor(private dataSource: DataSource) {}
```

**`@ReflectMetadata` directly** — use the `Reflector` class with typed `createParamDecorator` helpers. Direct `Reflect.metadata` calls bypass NestJS's type system and break with strict mode.

**Unscoped `process.env` access in services** — always inject `ConfigService` instead. Direct `process.env` reads bypass validation and make testing harder.

---

## Version-specific notes for AI agents

- `@nestjs/axios` wraps responses in an `AxiosResponse` observable — always unwrap with `map(r => r.data)` or use `lastValueFrom`.
- `nest-cli.json` in v9 defaults to `deleteOutDir: true`; generated code that relies on leftover build artifacts will silently break on clean builds.
- `ModuleRef.get(token, { strict: false })` is needed to retrieve providers from sibling modules — omitting `strict: false` throws `UnknownElementException` in v9.
- When using `REQUEST`-scoped providers, every provider in the chain must also be `REQUEST`-scoped or the container throws a scope mismatch error at startup — not at runtime.
- `SerializeInterceptor` from `@nestjs/common` now requires `ClassSerializerInterceptor` to be registered via `APP_INTERCEPTOR` to properly apply `@Exclude()` and `@Expose()` from `class-transformer` v0.5+.