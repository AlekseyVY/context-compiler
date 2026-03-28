# context-compiler

[![npm version](https://img.shields.io/npm/v/context-compiler.svg)](https://www.npmjs.com/package/context-compiler)
[![npm downloads](https://img.shields.io/npm/dm/context-compiler.svg)](https://www.npmjs.com/package/context-compiler)
[![License](https://img.shields.io/npm/l/context-compiler.svg)](./LICENSE)
[![Node.js](https://img.shields.io/node/v/context-compiler.svg)](https://nodejs.org)

> Agentic context compiler for AI-assisted development in TypeScript and JavaScript projects.

`context-compiler` analyzes your project's configuration files — `package.json`, `tsconfig.json`, ESLint rules, and your own `CONTEXT.md` — and synthesizes them into a single, conflict-free Cursor rules file (`.mdc`). It uses an LLM to resolve semantic conflicts between sources: if your `CONTEXT.md` says "we don't use ReactiveFormsModule" and the Angular skill recommends it, the compiler silently drops the irrelevant guidance rather than including contradictory instructions.

**Why this matters:** AI coding agents follow rules more reliably when those rules are specific, consistent, and free of contradictions. Hand-written rules miss things. Generic rules ignore your project's reality. `context-compiler` bridges the gap by generating rules that reflect what your project *actually enforces* — not what some template suggests.

## How it works

The compiler runs a four-phase pipeline every time you invoke `compile`:

The first phase is **Static Scanning** — it reads `package.json`, `tsconfig.json`, `.eslintrc.json`, `README.md`, and `CONTEXT.md` without any LLM involvement. This is fast, deterministic, and free.

The second phase is **Skill Resolution** — based on detected technologies (Angular, React, Node.js, TypeScript, etc.) and their major versions, it loads the corresponding best-practice skill files bundled with the package. For a project on Angular 16, it looks for `angular/16/skill.md` first, then falls back to the generic `angular/skill.md`.

The third phase is **LLM Synthesis** — a single API call to your chosen model via [OpenRouter](https://openrouter.ai). The model receives all sources structured by priority and produces a coherent, deduplicated instruction set. It does not read your source code, only your configuration.

The fourth phase is **Writing** — in `--dry-run` mode it prints the result to stdout so you can review it. With `--apply` it writes `.cursor/rules/auto-context.mdc` which Cursor picks up automatically.
```
package.json ──┐
tsconfig.json ─┤ Phase 1: Scan  →  Phase 2: Resolve Skills
.eslintrc.json ┤                          │
CONTEXT.md ────┘                          ↓
                                  Phase 3: LLM Synthesis
                                          │
                                          ↓
                              .cursor/rules/auto-context.mdc
```

## Priority hierarchy

When sources conflict, the compiler follows a strict priority order. Your `CONTEXT.md` has the highest authority — it represents deliberate team decisions. TypeScript compiler options and ESLint rules come next, since they are enforced by tooling and cannot be violated. Generic technology skill files have the lowest priority and are overridden by everything above them.
```
CONTEXT.md          ← highest — your project's law
tsconfig.json       ← enforced by compiler
.eslintrc.*         ← enforced by linter  
base-skills/*.md    ← lowest — general best practices
```

## Quick start

Run the initializer once in your project root. It will ask for your OpenRouter API key, copy a `CONTEXT.md` template, create the `.agent/skills/` directory, and add `context-compiler` to your `devDependencies`:
```bash
npx context-compiler init
```

After initialization, compile your context:
```bash
# Preview without writing any files
npm run context:dry

# Generate and write .cursor/rules/auto-context.mdc
npm run context:compile
```

Re-run `context:compile` whenever your dependencies, TypeScript config, or ESLint rules change significantly. The `CONTEXT.md` file is where you invest the most time — the more accurately it describes your project's actual patterns, the better the generated rules will be.

## CONTEXT.md

The `CONTEXT.md` file is the most important input. It lives in your project root and has three sections:

**Best Practices Overrides** is where you replace standard framework patterns with your project's actual approach. If your team uses a custom form library instead of Angular's `ReactiveFormsModule`, write it here — the compiler will suppress all skill guidance about `ReactiveFormsModule` automatically.

**Constraints** is where you list hard rules with no exceptions. Things like "never use `any`, even in tests" or "all public service methods must have JSDoc" belong here.

**Architecture Decisions** is where you explain *why* your project is structured the way it is. This section gives the LLM the context to make better synthesis decisions — understanding that your project uses Micro Frontend architecture via Module Federation helps it generate rules that make sense for that context.
```markdown
## Best Practices Overrides

- Use `@company/forms` instead of `ReactiveFormsModule`.
  Patterns with FormBuilder, FormGroup, FormControl are not applicable.

## Constraints

- Never use `any`, even in tests.
- All public service methods must have JSDoc.

## Architecture Decisions

- Micro Frontend architecture via Module Federation.
  Shared state via EventBus only — no NgRx across MFE boundaries.
```

## Supported technologies

The compiler ships with skill files for the following technologies. If your project uses a technology not listed here, it is silently ignored — the compiler only acts on what it has knowledge about.

| Technology | Versioned skills | Generic fallback |
|---|---|---|
| TypeScript | 6.x | ✓ |
| JavaScript (ES2025+) | — | ✓ |
| Node.js | — | ✓ |
| Angular | — | ✓ |
| React | — | ✓ |

Version-specific skills take precedence over generic ones. For example, a project on TypeScript 6 will receive the `typescript/6/skill.md` rules (which include TS6-specific changes like `strict: true` being the new default) in addition to the base TypeScript skill.

## Configuration

Your OpenRouter API key and chosen model are stored in `.env` in your project root. The `.env` file is automatically added to `.gitignore` during `init`. You can change the model at any time by running `init` again or editing `.env` directly:
```bash
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=anthropic/claude-sonnet-4-5
```

Any model available on [OpenRouter](https://openrouter.ai/models) works. For best results use a model with strong instruction-following — `anthropic/claude-sonnet-4-5`, `google/gemini-2.0-flash-001`, or `mistralai/mistral-small-3.1-24b-instruct` are good choices.

## Requirements

Node.js 22 or higher is required. The package has zero runtime dependencies — everything is implemented using Node.js built-in modules.

## License

Apache 2.0 — see [LICENSE](./LICENSE) for details.

When using or distributing this software, please retain the [NOTICE](./NOTICE) file which attributes the original author.

Built by [Aleksey Vasiliev](https://github.com/AlekseyVY).