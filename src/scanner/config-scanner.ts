import { readFile, access, readdir } from 'node:fs/promises';
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
  const resolvedLib = await collectRootLibEntries(join(projectRoot, 'tsconfig.json'));
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

async function collectRootLibEntries(projectRoot: string): Promise<string[]> {
  let files: string[];

  try {
    const entries = await readdir(projectRoot);
    // Match any file starting with "tsconfig" and ending with ".json"
    files = entries.filter(f => f.startsWith('tsconfig') && f.endsWith('.json'));
  } catch {
    return [];
  }

  const allLibs = await Promise.all(
    files.map(async file => {
      const raw = await safeReadFile(join(projectRoot, file));
      if (!raw) return [];

      try {
        const parsed = JSON.parse(
          // Strip JSONC comments — tsconfig files allow them
          raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
        ) as { compilerOptions?: { lib?: string[] } };

        return (parsed.compilerOptions?.lib ?? []).map(l => l.toLowerCase());
      } catch {
        return [];
      }
    })
  );

  // Deduplicate — multiple tsconfigs may declare "dom" independently
  return [...new Set(allLibs.flat())];
}