import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

export interface Credentials {
  apiKey: string;
  model: string;
}

const ENV_KEY = 'OPENROUTER_API_KEY';
const ENV_MODEL = 'OPENROUTER_MODEL';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-5';

async function parseDotEnv(dir: string): Promise<Map<string, string>> {
  try {
    const content = await readFile(join(dir, '.env'), 'utf-8');
    const result = new Map<string, string>();
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const sep = trimmed.indexOf('=');
      if (sep === -1) continue;
      const key = trimmed.slice(0, sep).trim();
      const value = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, '');
      result.set(key, value);
    }
    return result;
  } catch {
    return new Map();
  }
}

async function writeDotEnv(dir: string, key: string, value: string): Promise<void> {
  const path = join(dir, '.env');
  let content = '';
  try { content = await readFile(path, 'utf-8'); } catch { /* will create */ }
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(content)) {
    await writeFile(path, content.replace(pattern, `${key}=${value}`));
  } else {
    const separator = content && !content.endsWith('\n') ? '\n' : '';
    await writeFile(path, `${content}${separator}${key}=${value}\n`);
  }
}

// Simple cross-platform prompt — no hidden mode, works reliably on
// Windows (Git Bash, PowerShell, cmd) and Unix alike.
// Hidden input can be added in v2 via a proper cross-platform library.
export async function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function loadCredentials(projectRoot: string): Promise<Credentials> {
  const env = await parseDotEnv(projectRoot);
  const apiKey = process.env[ENV_KEY] ?? env.get(ENV_KEY) ?? '';
  const model = process.env[ENV_MODEL] ?? env.get(ENV_MODEL) ?? DEFAULT_MODEL;
  return { apiKey, model };
}

export async function saveCredentials(
  projectRoot: string,
  credentials: Credentials,
): Promise<void> {
  await writeDotEnv(projectRoot, ENV_KEY, credentials.apiKey);
  await writeDotEnv(projectRoot, ENV_MODEL, credentials.model);
}