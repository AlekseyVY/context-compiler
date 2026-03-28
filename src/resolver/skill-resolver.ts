import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DetectedTechnology, ResolvedSkill } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const packageRoot = join(__filename, '..', '..', '..');

// Strips YAML frontmatter block from skill content before passing to LLM.
// The frontmatter (name, description) is metadata for tooling, not instructions
// for the AI — sending it wastes tokens and pollutes the context.
function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) return content;
  const end = content.indexOf('---', 3);
  if (end === -1) return content;
  return content.slice(end + 3).trimStart();
}

async function tryReadSkill(path: string): Promise<string | null> {
  try {
    await access(path);
    const content = await readFile(path, 'utf-8');
    return stripFrontmatter(content.replace(/\r\n/g, '\n'));
  } catch {
    return null;
  }
}

// Resolution strategy: exact major version first, then generic fallback.
// We never load a skill for a NEWER major than requested — a project on
// Angular 14 should not receive Angular 17 patterns which may be incompatible.
async function resolveOneSkill(tech: DetectedTechnology): Promise<ResolvedSkill | null> {
  const base = join(packageRoot, 'base-skills', tech.name);

  // Attempt 1: exact major version match e.g. base-skills/typescript/6/skill.md
  if (tech.major > 0) {
    const versionedPath = join(base, String(tech.major), 'skill.md');
    const content = await tryReadSkill(versionedPath);
    if (content) {
      return {
        technology: tech.name,
        requestedMajor: tech.major,
        resolvedMajor: tech.major,
        isFallback: false,
        content,
      };
    }
  }

  // Attempt 2: generic fallback e.g. base-skills/typescript/skill.md
  const genericPath = join(base, 'skill.md');
  const content = await tryReadSkill(genericPath);
  if (content) {
    return {
      technology: tech.name,
      requestedMajor: tech.major,
      resolvedMajor: 0,
      isFallback: true,
      content,
    };
  }

  // No skill found — warn and skip rather than crash.
  // This is intentional: an unknown technology should not block compilation
  // for the technologies we DO support.
  process.stderr.write(
    `[context-compiler] warning: no skill found for "${tech.name}@${tech.major}" — skipping.\n`
  );
  return null;
}

export async function resolveSkills(
  technologies: DetectedTechnology[],
): Promise<ResolvedSkill[]> {
  const results = await Promise.all(technologies.map(resolveOneSkill));

  // Filter out nulls from technologies with no matching skill file.
  // TypeScript's type narrowing needs the explicit predicate here because
  // Array.filter alone does not narrow T | null to T in generic contexts.
  return results.filter((r): r is ResolvedSkill => r !== null);
}