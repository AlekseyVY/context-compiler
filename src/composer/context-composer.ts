// src/composer/context-composer.ts
import { chat } from '../lib/llm-client.js';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';
import type { ScannedConfig, ResolvedSkill } from '../types.js';
import type { Credentials } from '../lib/credentials.js';

export async function composeContext(
  config: ScannedConfig,
  skills: ResolvedSkill[],
  credentials: Credentials,
): Promise<string> {
  const response = await chat({
    apiKey: credentials.apiKey,
    model: credentials.model,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user',   content: buildUserPrompt(config, skills) },
    ],
    temperature: 0.1,
    maxTokens: 2048,
  });

  const firstChoice = response.choices[0];
  if (!firstChoice) {
    throw new Error('[context-compiler] LLM returned no choices in response.');
  }

  const raw = firstChoice.message.content;
  if (!raw) {
    throw new Error('[context-compiler] LLM returned empty content.');
  }

  return normalizeMdcOutput(raw);
}

// LLMs sometimes wrap the entire output in a ```yaml or ```markdown fence,
// or produce double frontmatter. This function produces clean .mdc content
// regardless of how the model decided to format its response.
function normalizeMdcOutput(raw: string): string {
  let content = raw.trim();

  // Strip outer code fence if the model wrapped everything in ```yaml or ```markdown
  // Pattern: starts with ```<lang>\n and ends with ```
  const fenceMatch = content.match(/^```(?:yaml|markdown|mdc|)?\n([\s\S]*?)```$/);
  if (fenceMatch?.[1]) {
    content = fenceMatch[1].trim();
  }

  // At this point content should start with --- (frontmatter).
  // If the model omitted frontmatter entirely, add it defensively.
  if (!content.startsWith('---')) {
    return `---\nalwaysApply: true\ndescription: Auto-generated project context\n---\n\n${content}`;
  }

  return content;
}