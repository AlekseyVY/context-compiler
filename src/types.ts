// src/types.ts

// ── ТЕХНОЛОГИИ И СКАНЕР ────────────────────────────────────────────────────

/** Маппинг: имя npm-пакета → имя технологии в нашей системе.
 *  Это декларативная конфигурация: добавить технологию = добавить одну строку.
 *  Решение «есть скилл или нет» принимает файловая система — если существует
 *  base-skills/angular/, значит Angular поддерживается. */
export const TECHNOLOGY_MAP: Record<string, string> = {
  // Frontend frameworks
  '@angular/core': 'angular',
  'react': 'react',
  // Meta-frameworks
  'next': 'nextjs', 
  // Backend frameworks
  '@nestjs/core': 'nestjs',
} as const;

export interface PackageJsonData {
  name: string;
  version: string;
  engines?: { node?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface DetectedTechnology {
  name: string;    // "angular"
  raw: string;     // "^16.2.8"
  major: number;   // 16
}

export interface ScannedConfig {
  projectName: string;
  projectRoot: string;
  technologies: DetectedTechnology[];
  tsCompilerOptions: Record<string, unknown> | null;
  eslintRules: string[];
  readmeContent: string | null;
  contextMdContent: string | null;  // содержимое CONTEXT.md если есть
}

// ── СКИЛЛЫ И ПРАВИЛА ───────────────────────────────────────────────────────

export interface ResolvedSkill {
  technology: string;      // "angular"
  requestedMajor: number;  // 16
  resolvedMajor: number;   // 16 (точное) или 15 (fallback)
  isFallback: boolean;
  content: string;
}

/** Пять уровней приоритета — от наивысшего к наименьшему.
 *  context-md > tsconfig > eslint > readme > skill */
export type RuleSource = 'context-md' | 'tsconfig' | 'eslint' | 'readme' | 'skill';

export interface CompiledRule {
  source: RuleSource;
  content: string;
}

// ── OPENROUTER / LLM CLIENT ────────────────────────────────────────────────
// Мы типизируем ровно то что используем — не весь API.
// OpenRouter совместим с OpenAI Chat Completions format.

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON-строка, требует JSON.parse()
  };
}

export interface LLMChoice {
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: LLMToolCall[];
  };
  finish_reason: 'stop' | 'tool_calls' | 'length';
}

export interface LLMResponse {
  id: string;
  choices: LLMChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMChatParams {
  apiKey: string;
  model: string;
  messages: LLMMessage[];
  tools?: LLMTool[];
  temperature?: number;
  maxTokens?: number;
}