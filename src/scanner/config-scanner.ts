import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScannedConfig, DetectedTechnology, PackageJsonData } from '../types.js';
import { TECHNOLOGY_MAP } from '../types.js';
import { logger } from '../lib/debug-logger.js';

async function safeReadFile(path: string): Promise<string | null> {
  try {
    const content = await readFile(path, 'utf-8');
    return content.replace(/\r\n/g, '\n');
  } catch {
    return null;
  }
}

function extractMajorVersion(raw: string): number {
  const cleaned = raw.replace(/^[^0-9]*/, '');
  const major = parseInt(cleaned.split('.')[0] ?? '0', 10);
  return isNaN(major) ? 0 : major;
}

async function skillExists(packageRoot: string, techName: string): Promise<boolean> {
  try {
    // Check for skill.md specifically, not just the directory.
    // This prevents false positives from empty directories.
    await access(join(packageRoot, 'base-skills', techName, 'skill.md'));
    return true;
  } catch {
    return false;
  }
}

async function detectTechnologies(
  pkg: PackageJsonData,
  packageRoot: string,
  resolvedLib: string[],
): Promise<DetectedTechnology[]> {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const results: DetectedTechnology[] = [];

  for (const [packageName, techName] of Object.entries(TECHNOLOGY_MAP)) {
    const raw = allDeps[packageName];
    if (!raw) continue;
    if (!(await skillExists(packageRoot, techName))) continue;
    results.push({ name: techName, raw, major: extractMajorVersion(raw) });
  }

  const tsRaw = pkg.devDependencies?.['typescript'] ?? pkg.dependencies?.['typescript'];
  if (tsRaw && (await skillExists(packageRoot, 'typescript'))) {
    results.push({ name: 'typescript', raw: tsRaw, major: extractMajorVersion(tsRaw) });
  }

  const hasTypesNode = !!(
    pkg.devDependencies?.['@types/node'] ??
    pkg.dependencies?.['@types/node']
  );

  // resolvedLib already comes lowercased and flattened from resolveLibEntries —
  // no need to extract from compilerOptions or call .toLowerCase() here.
  const hasDomLib = resolvedLib.includes('dom');

  const shouldAddNode = hasTypesNode && !hasDomLib;

  if (shouldAddNode && (await skillExists(packageRoot, 'nodejs'))) {
    const raw = pkg.engines?.node ?? '>=22';
    results.push({ name: 'nodejs', raw, major: extractMajorVersion(raw) });
  }

  return results;
}

function parseEslintRules(raw: string): string[] {
  try {
    const config = JSON.parse(raw) as { rules?: Record<string, unknown> };
    if (!config.rules) return [];
    return Object.entries(config.rules).map(([rule, value]) => {
      const severity = Array.isArray(value) ? value[0] : value;
      return `${rule}: ${String(severity)}`;
    });
  } catch {
    return [];
  }
}

export async function scanProjectConfig(projectRoot: string): Promise<ScannedConfig> {
  const packageJsonRaw = await safeReadFile(join(projectRoot, 'package.json'));
  if (!packageJsonRaw) {
    throw new Error(
      `[context-compiler] package.json not found in ${projectRoot}.\n` +
      `Make sure you run this command from your project root.`
    );
  }

  const pkg = JSON.parse(packageJsonRaw) as PackageJsonData;

  // fileURLToPath correctly handles Windows paths like C:\Users\...
  // whereas new URL().pathname would return /C:/Users/... with a spurious leading slash.
  const packageRoot = fileURLToPath(new URL('../../', import.meta.url));

  const [tsconfigRaw, eslintRaw, readmeRaw, contextMdRaw] = await Promise.all([
    safeReadFile(join(projectRoot, 'tsconfig.json')),
    safeReadFile(join(projectRoot, '.eslintrc.json')),
    safeReadFile(join(projectRoot, 'README.md')),
    safeReadFile(join(projectRoot, 'CONTEXT.md')),
  ]);

  const tsConfig = tsconfigRaw
    ? (JSON.parse(tsconfigRaw) as { compilerOptions?: Record<string, unknown> })
    : null;
  const resolvedLib = await resolveLibEntries(join(projectRoot, 'tsconfig.json'));
  const technologies = await detectTechnologies(pkg, packageRoot, resolvedLib);
  const eslintRules = eslintRaw ? parseEslintRules(eslintRaw) : [];

  await logger.log('PHASE 1 — Scanner output', {
    projectName: pkg.name,
    projectRoot,
    // Show every raw dependency so we can see what TECHNOLOGY_MAP matched against
    allDependencies: { ...pkg.dependencies, ...pkg.devDependencies },
    engines: pkg.engines,
    detectedTechnologies: technologies,
    resolvedLib,
    tsCompilerOptions: tsConfig?.compilerOptions ?? null,
    eslintRulesCount: eslintRules.length,
    eslintRules,
    hasReadme: !!readmeRaw,
    hasContextMd: !!contextMdRaw,
    contextMdPreview: contextMdRaw?.slice(0, 500) ?? null,
  });

  return {
    projectName: pkg.name ?? 'unknown',
    projectRoot,
    technologies,
    tsCompilerOptions: tsConfig?.compilerOptions ?? null,
    eslintRules, 
    readmeContent: readmeRaw,
    contextMdContent: contextMdRaw,
  };
}

// Collect all lib entries from a tsconfig and any configs it references.
// This handles the Vite composite build pattern where the root tsconfig.json
// has no compilerOptions at all — only { "references": [...] }.
// Without following references we'd always see an empty lib array for
// root configs, making DOM detection impossible and causing false Node.js
// skill injection.
async function resolveLibEntries(
  tsconfigPath: string,
  visited = new Set<string>(),
): Promise<string[]> {
  // Guard against circular references (unlikely but possible in monorepos)
  if (visited.has(tsconfigPath)) return [];
  visited.add(tsconfigPath);

  const raw = await safeReadFile(tsconfigPath);
  if (!raw) return [];

  let parsed: { compilerOptions?: { lib?: string[] }; references?: { path: string }[] };
  try {
    parsed = JSON.parse(raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''));
  } catch {
    return [];
  }

  // Collect lib from this config's own compilerOptions
  const ownLib = (parsed.compilerOptions?.lib ?? []).map((l: string) => l.toLowerCase());

  // Then follow each referenced child config
  const dir = join(tsconfigPath, '..');
  const childLibs = await Promise.all(
    (parsed.references ?? []).map(ref => {
      // A reference path can point to a directory (resolved to tsconfig.json)
      // or directly to a .json file
      const refPath = ref.path.endsWith('.json')
        ? join(dir, ref.path)
        : join(dir, ref.path, 'tsconfig.json');
      return resolveLibEntries(refPath, visited);
    })
  );

  return [...ownLib, ...childLibs.flat()];
}