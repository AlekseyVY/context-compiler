// src/composer/prompts.ts
import type { ScannedConfig, ResolvedSkill } from '../types.js';

// Builds the system prompt that establishes the LLM's role and the
// priority hierarchy it must follow when resolving conflicts.
// This is intentionally verbose — for synthesis tasks, more context
// produces more accurate conflict resolution than terse instructions.
export function buildSystemPrompt(): string {
  return `You are an expert software architect generating a Cursor AI rules file (.mdc).
Your task is to synthesize multiple sources of project context into a single, 
coherent, conflict-free instruction set for an AI coding agent.

You must follow this STRICT priority hierarchy when sources conflict:

PRIORITY 1 (HIGHEST) — CONTEXT.md sections:
  "Best Practices Overrides" and "Constraints" and "Architecture Decisions"
  These represent deliberate team decisions that OVERRIDE everything below.
  If CONTEXT.md says "we don't use ReactiveFormsModule", remove ALL skill 
  guidance about ReactiveFormsModule — do not mention it at all.

PRIORITY 2 — TypeScript compiler options (tsconfig.json):
  These are enforced by the compiler and cannot be violated.
  If strict: true is active, never suggest patterns that require loosening it.
  If noImplicitAny is active, never suggest using 'any' as a workaround.

PRIORITY 3 — ESLint rules:
  These are enforced by the linter. Never suggest patterns that would trigger
  a configured rule. If "no-console: error" is set, never suggest console.log.

PRIORITY 4 (LOWEST) — Technology skill files:
  General best practices for detected technologies.
  Apply these unless overridden by a higher priority source.

CONFLICT RESOLUTION RULES:
- When CONTEXT.md overrides a skill pattern: silently drop the skill pattern.
  Do not explain the conflict in the output — just use the project's approach.
- When tsconfig/eslint contradicts a skill: follow tsconfig/eslint strictly.
- When sources agree: merge into one clear statement, do not repeat the rule twice.
- When a skill mentions a pattern not relevant to this project: omit it entirely.

OUTPUT FORMAT — you must produce a valid Cursor .mdc file:
- Start with YAML frontmatter: ---\\nalwaysApply: true\\ndescription: Auto-generated project context\\n---
- Write in clear, direct imperative sentences ("Use X", "Never Y", "Always Z").
- Group rules by theme with ## headings (Technology Stack, TypeScript Rules, 
  Code Style, Architecture, Constraints).
- Be specific and actionable. Bad: "write good code". Good: "Use OnPush 
  change detection for all Angular components — Default is prohibited."
- Maximum 600 words in the output. Concise rules are followed more reliably
  than verbose explanations.`;
}

// Builds the user message that contains all the actual project data.
// We structure it as clearly labeled sections so the LLM can easily
// locate each priority level during its synthesis process.
export function buildUserPrompt(
  config: ScannedConfig,
  skills: ResolvedSkill[],
): string {
  const parts: string[] = [];

  parts.push(`# Project: ${config.projectName}`);
  parts.push(`Detected technologies: ${
    config.technologies.map(t => `${t.name}@${t.major}`).join(', ') || 'none detected'
  }`);

  // PRIORITY 1: CONTEXT.md — highest authority
  if (config.contextMdContent) {
    parts.push(`
## [PRIORITY 1] CONTEXT.md — Project-Specific Rules
${config.contextMdContent}`);
  } else {
    parts.push(`\n## [PRIORITY 1] CONTEXT.md — not present, skip this level.`);
  }

  // PRIORITY 2: TypeScript compiler options
  if (config.tsCompilerOptions) {
    // We only send flags that are actually meaningful for code generation.
    // Sending outDir, rootDir etc. wastes tokens with zero benefit.
    const relevantFlags = [
      'strict', 'noImplicitAny', 'strictNullChecks', 'noUncheckedIndexedAccess',
      'exactOptionalPropertyTypes', 'noImplicitReturns', 'target', 'module',
      'moduleResolution', 'esModuleInterop',
    ];

    const filtered = Object.fromEntries(
      Object.entries(config.tsCompilerOptions)
        .filter(([key]) => relevantFlags.includes(key))
    );

    parts.push(`
## [PRIORITY 2] TypeScript Compiler Options
\`\`\`json
${JSON.stringify(filtered, null, 2)}
\`\`\``);
  }

  // PRIORITY 3: ESLint rules
  if (config.eslintRules.length > 0) {
    parts.push(`
## [PRIORITY 3] ESLint Rules (enforced, never violate)
${config.eslintRules.map(r => `- ${r}`).join('\n')}`);
  }

  // PRIORITY 4: Technology skills
  if (skills.length > 0) {
    for (const skill of skills) {
      const label = skill.isFallback
        ? `${skill.technology} (generic fallback)`
        : `${skill.technology} v${skill.requestedMajor}`;

      parts.push(`
## [PRIORITY 4] Skill: ${label}
${skill.content}`);
    }
  } else {
    parts.push(`\n## [PRIORITY 4] No technology skills found.`);
  }

  parts.push(`
---
Synthesize ALL sources above into a single Cursor .mdc file following the 
priority hierarchy and conflict resolution rules from your instructions.`);

  return parts.join('\n');
}