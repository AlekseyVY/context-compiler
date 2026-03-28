import { mkdir, copyFile, access, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCredentials, saveCredentials, prompt } from '../lib/credentials.js';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function patchProjectPackageJson(projectRoot: string): Promise<void> {
  const pkgPath = join(projectRoot, 'package.json');
  const raw = await readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(raw) as Record<string, unknown>;

  // Добавляем скрипты — не перезаписываем если уже есть
  const scripts = (pkg['scripts'] ?? {}) as Record<string, string>;
  if (!scripts['context:compile']) {
    scripts['context:compile'] = 'context-compiler compile --apply';
  }
  if (!scripts['context:dry']) {
    scripts['context:dry'] = 'context-compiler compile --dry-run';
  }
  pkg['scripts'] = scripts;

  // Добавляем себя в devDependencies
  const devDeps = (pkg['devDependencies'] ?? {}) as Record<string, string>;
  if (!devDeps['context-compiler']) {
    devDeps['context-compiler'] = '^0.1.2';
  }
  pkg['devDependencies'] = devDeps;

  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  process.stderr.write('✅ package.json updated with context-compiler scripts\n');
}

async function ensureGitignore(projectRoot: string, entry: string): Promise<void> {
  const path = join(projectRoot, '.gitignore');
  let content = '';
  try { content = await readFile(path, 'utf-8'); } catch { /* will create */ }
  if (content.split('\n').some(l => l.trim() === entry)) return;
  const separator = content && !content.endsWith('\n') ? '\n' : '';
  await writeFile(path, `${content}${separator}${entry}\n`);
}

async function copyContextTemplate(dest: string): Promise<void> {
  const templatePath = join(__dirname, '..', '..', 'CONTEXT.md.template');
  await copyFile(templatePath, dest);
}

export async function runInit(projectRoot: string): Promise<void> {
  process.stderr.write('\n🔧  context-compiler — project initialization\n');
  process.stderr.write('─'.repeat(48) + '\n\n');

  const existing = await loadCredentials(projectRoot);

  // ── STEP 1: API KEY ───────────────────────────────────────────────────────
  process.stderr.write('Step 1 of 2 — OpenRouter API key\n');

  let apiKey = existing.apiKey;

  if (apiKey) {
    process.stderr.write('✅ API key already set — skipping.\n\n');
  } else {
    process.stderr.write('Get your key at: https://openrouter.ai/keys\n');
    apiKey = await prompt('Enter API key: ');
    process.stderr.write('\n');

    if (!apiKey) {
      process.stderr.write('❌ API key is required. Aborting.\n');
      process.exit(1);
    }
  }

  // ── STEP 2: MODEL ─────────────────────────────────────────────────────────
  process.stderr.write('Step 2 of 2 — Model selection\n');
  process.stderr.write(`Default: ${existing.model}\n`);
  const modelInput = await prompt('Enter model (or press Enter to keep default): ');
  const model = modelInput || existing.model;
  process.stderr.write('\n');

  await saveCredentials(projectRoot, { apiKey, model });
  await ensureGitignore(projectRoot, '.env');
  process.stderr.write('✅ Credentials saved to .env\n');

  // ── CONTEXT.md ────────────────────────────────────────────────────────────
  const contextDest = join(projectRoot, 'CONTEXT.md');
  if (await exists(contextDest)) {
    const answer = await prompt('CONTEXT.md already exists. Overwrite? (y/N): ');
    if (answer.toLowerCase() === 'y') {
      await copyContextTemplate(contextDest);
      process.stderr.write('✅ CONTEXT.md overwritten\n');
    } else {
      process.stderr.write('⏭  Keeping existing CONTEXT.md\n');
    }
  } else {
    await copyContextTemplate(contextDest);
    process.stderr.write('✅ CONTEXT.md created\n');
  }

  // ── .agent/skills/ ────────────────────────────────────────────────────────
  await mkdir(join(projectRoot, '.agent', 'skills'), { recursive: true });
  process.stderr.write('✅ .agent/skills/ ready\n');

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  process.stderr.write('\n' + '─'.repeat(48) + '\n');
  process.stderr.write('✨ Done! Next steps:\n\n');
  process.stderr.write('  1. Edit CONTEXT.md with your project-specific rules\n');
  process.stderr.write('  2. Run: npx context-compiler compile --dry-run\n');
  process.stderr.write('  3. Review output, then: npx context-compiler compile --apply\n\n');

  await patchProjectPackageJson(projectRoot);

  process.stderr.write('Installing context-compiler as devDependency...\n');
  execSync('npm install', { cwd: projectRoot, stdio: 'inherit' });
  process.stderr.write('✅ Installed\n');
}