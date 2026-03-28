import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function writeOutput(
  content: string,
  projectRoot: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    process.stdout.write(content + '\n');
    return;
  }

  const rulesDir = join(projectRoot, '.cursor', 'rules');
  await mkdir(rulesDir, { recursive: true });

  const outputPath = join(rulesDir, 'auto-context.mdc');
  await writeFile(outputPath, content, 'utf-8');

  process.stderr.write(`✅ Context written to ${outputPath}\n`);
  process.stderr.write(`   Add .cursor/rules/auto-context.mdc to git to share with your team.\n`);
}