const USAGE = `
context-compiler — agentic context compiler for AI-assisted development

Usage:
  context-compiler <command> [options]

Commands:
  init      Initialize context-compiler in the current project.
            Creates .agent/ directory, copies CONTEXT.md template,
            and saves your OpenRouter API key to .env

  compile   Analyze the project and generate .cursor/rules/auto-context.mdc
            --dry-run   Print result to stdout without writing files (default)
            --apply     Write the generated context to .cursor/rules/

Examples:
  npx context-compiler init
  npx context-compiler compile --dry-run
  npx context-compiler compile --apply
`.trim();

async function main(): Promise<void> {
  const [,, command, ...args] = process.argv;

  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  if (command === 'init') {
    console.log('[TODO] init: not implemented yet');
    return;
  }

  if (command === 'compile') {
    const isDryRun = !args.includes('--apply');
    console.log(`[TODO] compile: not implemented yet (dry-run: ${isDryRun})`);
    return;
  }

  console.error(`Unknown command: "${command}"\n`);
  console.log(USAGE);
  process.exit(1);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal error: ${message}`);
  process.exit(1);
});