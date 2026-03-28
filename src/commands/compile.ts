import { scanProjectConfig } from '../scanner/config-scanner.js';
import { resolveSkills } from '../resolver/skill-resolver.js';
import { composeContext } from '../composer/context-composer.js';
import { writeOutput } from '../output/writer.js';
import { loadCredentials } from '../lib/credentials.js';

export async function runCompile(projectRoot: string, dryRun: boolean): Promise<void> {
  process.stderr.write(`\n⚙️  context-compiler — ${dryRun ? 'dry run' : 'apply'}\n\n`);

  process.stderr.write('Phase 1/3  Scanning project config...\n');
  const config = await scanProjectConfig(projectRoot);
  process.stderr.write(`           Found: ${config.technologies.map(t => `${t.name}@${t.major}`).join(', ') || 'no known technologies'}\n`);
  process.stderr.write(`           ESLint rules: ${config.eslintRules.length}\n`);
  process.stderr.write(`           CONTEXT.md: ${config.contextMdContent ? 'present' : 'not found'}\n\n`);

  process.stderr.write('Phase 2/3  Resolving skills...\n');
  const skills = await resolveSkills(config.technologies);
  process.stderr.write(`           Resolved: ${skills.map(s => s.technology + (s.isFallback ? ' (fallback)' : '')).join(', ') || 'none'}\n\n`);

  const credentials = await loadCredentials(projectRoot);
  if (!credentials.apiKey) {
    process.stderr.write('❌ No API key found. Run: npx context-compiler init\n');
    process.exit(1);
  }

  process.stderr.write(`Phase 3/3  Synthesizing with ${credentials.model}...\n`);
  const content = await composeContext(config, skills, credentials);
  process.stderr.write('           Done.\n\n');

  await writeOutput(content, projectRoot, dryRun);

  if (dryRun) {
    process.stderr.write('\nℹ️  Dry run — no files written. Use --apply to save.\n');
  }
}