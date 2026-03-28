import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScannedConfig, DetectedTechnology, PackageJsonData } from '../types.js';
import { TECHNOLOGY_MAP } from '../types.js';

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
  tsConfig: { compilerOptions?: Record<string, unknown> } | null,
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

  const libArray = (tsConfig?.compilerOptions?.lib as string[] | undefined)
    ?.map(l => l.toLowerCase()) ?? [];

  const hasDomLib = libArray.includes('dom');

  const shouldAddNode = hasTypesNode || (!hasDomLib && libArray.length > 0);

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

  return {
    projectName: pkg.name ?? 'unknown',
    projectRoot,
    technologies: await detectTechnologies(pkg, packageRoot, tsConfig),
    tsCompilerOptions: tsConfig?.compilerOptions ?? null,
    eslintRules: eslintRaw ? parseEslintRules(eslintRaw) : [],
    readmeContent: readmeRaw,
    contextMdContent: contextMdRaw,
  };
}