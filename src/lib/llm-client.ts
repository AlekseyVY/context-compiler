import type { LLMChatParams, LLMResponse } from '../types.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function chat(params: LLMChatParams): Promise<LLMResponse> {
  const {
    apiKey,
    model,
    messages,
    tools,
    temperature = 0.2,
    maxTokens = 32768,
  } = params;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (tools && tools.length > 0) {
    body['tools'] = tools;
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/AlekseyVY/context-compiler',
      'X-Title': 'context-compiler',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<LLMResponse>;
}