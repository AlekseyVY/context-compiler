// src/composer/context-composer.ts
import { chat } from '../lib/llm-client.js';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';
import type { ScannedConfig, ResolvedSkill } from '../types.js';
import type { Credentials } from '../lib/credentials.js';
import { logger } from '../lib/debug-logger.js';

export async function composeContext(
  config: ScannedConfig,
  skills: ResolvedSkill[],
  credentials: Credentials,
): Promise<string> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(config, skills);

  // BEFORE the call — log exactly what the LLM will receive
  await logger.log('PHASE 3 — LLM request', {
    model: credentials.model,
    temperature: 0.1,
    maxTokens: 2048,
    skillsInContext: skills.map(s => s.technology),
  });
  await logger.log('PHASE 3 — system prompt', systemPrompt);
  await logger.log('PHASE 3 — user prompt', userPrompt);

  const response = await chat({
    apiKey: credentials.apiKey,
    model: credentials.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
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

  // AFTER the call — log the raw response before normalization,
  // so we can see if the model wrapped output in fences or mangled frontmatter
  await logger.log('PHASE 3 — LLM raw response', {
    length: raw.length,
    content: raw,
  });

  const normalized = normalizeMdcOutput(raw);

  // Log the final normalized output so we can compare it with the raw version
  await logger.log('PHASE 3 — normalized output', normalized);

  return normalized;
}

function normalizeMdcOutput(raw: string): string {
  let content = raw.trim();

  const fenceMatch = content.match(/^```(?:yaml|markdown|mdc|)?\n([\s\S]*?)```$/);
  if (fenceMatch?.[1]) {
    content = fenceMatch[1].trim();
  }

  if (!content.startsWith('---')) {
    return `---\nalwaysApply: true\ndescription: Auto-generated project context\n---\n\n${content}`;
  }

  return content;
}