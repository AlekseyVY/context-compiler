import { appendFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Singleton debug logger. Activated once via enable() in the CLI entry point.
// All pipeline phases call logger.log() without knowing whether debug mode
// is active — they never touch the file system directly.
class DebugLogger {
  private enabled = false;
  private logPath = '';

  enable(projectRoot: string): void {
    this.enabled = true;
    // Place the log file in the project root so it's easy to find.
    // Named with a timestamp so multiple debug runs don't overwrite each other.
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    this.logPath = join(projectRoot, `context-compiler-debug-${ts}.log`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Synchronously-named but async underneath — callers fire-and-forget with void.
  // We never want logging to block the pipeline or crash on I/O failure.
  async log(section: string, data: unknown): Promise<void> {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const separator = '─'.repeat(60);
    const serialized =
      typeof data === 'string'
        ? data
        : JSON.stringify(data, null, 2);

    const entry = [
      '',
      separator,
      `[${timestamp}] ${section}`,
      separator,
      serialized,
      '',
    ].join('\n');

    try {
      await appendFile(this.logPath, entry, 'utf-8');
    } catch {
      // Never crash the main pipeline because of a logging failure.
    }
  }

  // Called once at the very start to write a clean header.
  async init(projectRoot: string, args: string[]): Promise<void> {
    if (!this.enabled) return;
    const header = [
      '╔══════════════════════════════════════════════════════════╗',
      '║          context-compiler — DEBUG LOG                    ║',
      '╚══════════════════════════════════════════════════════════╝',
      `Started:     ${new Date().toISOString()}`,
      `Project:     ${projectRoot}`,
      `CLI args:    ${args.join(' ')}`,
      '',
    ].join('\n');

    try {
      await writeFile(this.logPath, header, 'utf-8');
      // Print the log path to stderr so the user knows where to look.
      process.stderr.write(`[context-compiler] debug log: ${this.logPath}\n`);
    } catch {
      // ignore
    }
  }
}

// Export a single instance shared across the entire process.
export const logger = new DebugLogger();