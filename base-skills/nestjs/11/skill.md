---
name: nestjs-11
description: NestJS v11 patterns, idioms and breaking changes for AI coding agents
---

# NestJS 11 — Skill File

## What changed in this version

NestJS 11 ships Express v5 as the default HTTP adapter, which changes the route-matching algorithm via an upgraded `path-to-regexp`; all wildcard and optional route patterns must now use named syntax. Node.js v20 is the minimum required runtime — v16 and v18 are both dropped. Dynamic module deduplication now uses object-reference identity instead of hash comparison, so the same `forRoot()` call made twice produces two separate module instances. The `Reflector` class has updated return types: `getAllAndMerge` returns a plain object (not a single-element array) when metadata is object-shaped, and `getAllAndOverride` now returns `T | undefined`. The `CacheModule` from `@nestjs/cache-manager` migrates to `cache-manager` v6 with a Keyv-based storage adapter API.

---

## Core patterns — DO

**Named wildcards in route paths**
```typescript
@Get('files/*filePath')   // ✅ named wildcard
@Get('assets/*splat')     // ✅ named wildcard
```
Express v5 / `path-to-regexp` v8 requires every wildcard to carry a name.

**Braces for optional route segments**
```typescript
@Get(':file{.:ext}')  // ✅ optional extension segment
```
Optional segments use `{}` delimiters instead of `?` suffix on path-to-regexp v8.

**Store shared dynamic modules in a variable**
```typescript
const config = ConfigModule.forRoot({ isGlobal: true });
@Module({ imports: [config, config] })  // same reference = one instance
export class AppModule {}
```
Object-reference identity is now used for deduplication; two separate `forRoot()` calls produce two instances regardless of identical arguments.

**Handle `undefined` from `getAllAndOverride`**
```typescript
const value = this.reflector.getAllAndOverride<string>(KEY, [ctx.getHandler(), ctx.getClass()]);
if (value === undefined) return true;  // guard against undefined explicitly
```
The return type is now `T | undefined`, not `T`, so guards must handle the undefined case.

**JSON logging for production**
```typescript
const app = await NestFactory.create(AppModule, {
  logger: new ConsoleLogger({ json: true }),
});
```
Built-in JSON logging is available directly on `ConsoleLogger`; no custom logger wrapper needed for structured log output.

**Accessing the raw transporter client**
```typescript
const svc = app.connectMicroservice({ transport: Transport.NATS, options: { servers: ['nats://localhost:4222'] } });
const raw = svc.unwrap<NatsConnection>();  // direct access to native client
```
All microservice transporters expose `unwrap()` in v11; use it instead of reaching into internals.

**CacheModule with Keyv adapter**
```typescript
CacheModule.register({
  store: new KeyvRedis('redis://localhost:6379'),
})
```
`cache-manager` v6 uses Keyv adapters for all non-memory stores; the old `store: redisStore` pattern is removed.

---

## Anti-patterns — AVOID in 11

**Anonymous wildcards in routes**
```typescript
@Get('files/*')   // ❌ breaks on path-to-regexp v8
@Get('old/:id?')  // ❌ ? suffix no longer valid
```
Use `@Get('files/*path')` and `@Get(':id{.:ext}')` respectively.

**Regex-style global prefixes**
```typescript
app.setGlobalPrefix('(api|v1)');  // ❌ unsupported in v11
```
`setGlobalPrefix` no longer accepts RegExp-style strings. Use separate versioning strategies (`enableVersioning`) instead.

**Assuming `getAllAndMerge` always returns an array**
```typescript
const [first] = this.reflector.getAllAndMerge(KEY, targets);  // ❌ may return object directly
```
When the single metadata value is an object, v11 returns it directly, not wrapped in an array. Always check the shape before destructuring.

**Importing dynamic modules inline for singleton behavior**
```typescript
@Module({ imports: [FeatureModule.forRoot(opts), FeatureModule.forRoot(opts)] })
// ❌ two distinct instances in v11 despite identical opts
```
Assign to a variable and reuse the reference.

**Old cache-manager store API**
```typescript
import * as redisStore from 'cache-manager-redis-store';
CacheModule.register({ store: redisStore });  // ❌ removed in cache-manager v6
```
Migrate to a Keyv-compatible adapter (`@keyv/redis`, etc.).

---

## Version-specific notes for AI agents

- Always generate routes with **named** wildcards (`*name`, not `*`). Any unnamed wildcard will throw a startup error under `path-to-regexp` v8.
- Never assume Node.js 16 or 18 compatibility. The minimum is **Node.js 20**; use `engines: { node: ">=20" }` in generated `package.json` files.
- When generating guards or interceptors that call `reflector.getAllAndOverride`, always type the return as `T | undefined` and add a null-check — the v10 assumption that it always returns `T` is wrong.
- When generating `CacheModule` configuration, always use a **Keyv adapter** as the `store`. Do not generate `cache-manager-redis-store` or `cache-manager-ioredis` imports — these packages are incompatible with cache-manager v6.
- Dynamic modules imported more than once must be stored in a **shared variable** to remain singletons. Never generate inline `Module.forRoot(sameOpts)` calls in multiple places expecting deduplication.