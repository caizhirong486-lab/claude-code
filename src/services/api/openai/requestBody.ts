/**
 * Pure utility functions for building OpenAI request bodies and detecting
 * thinking mode. Extracted from index.ts so tests can import them without
 * triggering heavy module side-effects (OpenAI client, stream adapter, etc.).
 */
import type { ChatCompletionCreateParamsStreaming } from 'openai/resources/chat/completions/completions.mjs'
import { isEnvTruthy, isEnvDefinedFalsy } from '../../../utils/envUtils.js'

function getHostname(baseURL: string): string | null {
  try {
    return new URL(baseURL).hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Detect whether thinking mode should be enabled for this model.
 *
 * Enabled when:
 * 1. OPENAI_ENABLE_THINKING=1 is set (explicit enable), OR
 * 2. Model name contains "deepseek" or "mimo" (auto-detect, case-insensitive)
 *
 * Disabled when:
 * - OPENAI_ENABLE_THINKING=0/false/no/off is explicitly set (overrides model detection)
 *
 * @param model - The resolved OpenAI model name
 */
export function isOpenAIThinkingEnabled(model: string): boolean {
  // Explicit disable takes priority (overrides model auto-detect)
  if (isEnvDefinedFalsy(process.env.OPENAI_ENABLE_THINKING)) return false
  // Explicit enable
  if (isEnvTruthy(process.env.OPENAI_ENABLE_THINKING)) return true
  // Auto-detect from model name (DeepSeek and MiMo models support thinking mode).
  // Grok is intentionally excluded — Grok reasoning models reason automatically
  // and do NOT require thinking/enable_thinking request body parameters.
  const modelLower = model.toLowerCase()
  return modelLower.includes('deepseek') || modelLower.includes('mimo')
}

/**
 * Resolve max output tokens for the OpenAI-compatible path.
 *
 * Override priority:
 * 1. maxOutputTokensOverride (programmatic, from query pipeline)
 * 2. OPENAI_MAX_TOKENS env var (OpenAI-specific, useful for local models
 *    with small context windows, e.g. RTX 3060 12GB running 65536-token models)
 * 3. CLAUDE_CODE_MAX_OUTPUT_TOKENS env var (generic override)
 * 4. upperLimit default (64000)
 */
export function resolveOpenAIMaxTokens(
  upperLimit: number,
  maxOutputTokensOverride?: number,
): number {
  return (
    maxOutputTokensOverride ??
    (process.env.OPENAI_MAX_TOKENS
      ? parseInt(process.env.OPENAI_MAX_TOKENS, 10) || undefined
      : undefined) ??
    (process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS
      ? parseInt(process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, 10) || undefined
      : undefined) ??
    upperLimit
  )
}

/**
 * Detect whether the converted OpenAI-format messages contain multimodal image input.
 */
export function openAIMessagesContainImageInput(messages: unknown[]): boolean {
  return messages.some(message => {
    if (!message || typeof message !== 'object') return false
    const content = (message as Record<string, unknown>).content
    if (!Array.isArray(content)) return false
    return content.some(part => {
      if (!part || typeof part !== 'object') return false
      return (part as Record<string, unknown>).type === 'image_url'
    })
  })
}

/**
 * Whether the current OpenAI-compatible endpoint should be treated as accepting
 * OpenAI chat-completions image_url message content.
 *
 * This is intentionally conservative: only known-failing hosts are blocked.
 */
export function openAIEndpointSupportsImageInput(
  baseURL: string | undefined,
): boolean {
  if (!baseURL) return true
  const hostname = getHostname(baseURL)
  if (!hostname) return true

  // DeepSeek's current OpenAI-compatible chat.completions path rejects
  // image_url content blocks with a text-only deserialization error.
  if (hostname === 'api.deepseek.com') return false

  return true
}

export function buildOpenAIImageInputCompatError(params: {
  baseURL?: string
  model: string
}): string {
  const endpoint = params.baseURL ?? 'unknown endpoint'
  return (
    `Configured OpenAI-compatible endpoint does not accept image input on this request path. ` +
    `Endpoint: ${endpoint}. Model: ${params.model}. ` +
    `This prompt included an image attachment, but the server expects text-only message content. ` +
    `Remove the image, switch to a vision-capable endpoint/model, or use the Anthropic provider for screenshot analysis.`
  )
}

export function isImageInputRejectedOpenAIError(errorMessage: string): boolean {
  return /unknown variant [`'"]image_url[`'"].*expected [`'"]text[`'"]/i.test(
    errorMessage,
  )
}

/**
 * Build the request body for OpenAI chat.completions.create().
 * Extracted for testability — the thinking mode params are injected here.
 *
 * Three thinking-mode formats are sent simultaneously; each endpoint uses the
 * format it recognizes and ignores the others:
 * - Official DeepSeek API:    `thinking: { type: 'enabled' }`
 * - Self-hosted DeepSeek:     `enable_thinking: true` + `chat_template_kwargs: { thinking: true }`
 * - MiMo (Xiaomi):            `chat_template_kwargs: { enable_thinking: true }`
 * OpenAI SDK passes unknown keys through to the HTTP body.
 */
export function buildOpenAIRequestBody(params: {
  model: string
  messages: any[]
  tools: any[]
  toolChoice: any
  enableThinking: boolean
  maxTokens: number
  temperatureOverride?: number
}): ChatCompletionCreateParamsStreaming & {
  thinking?: { type: string }
  enable_thinking?: boolean
  chat_template_kwargs?: { thinking: boolean; enable_thinking: boolean }
} {
  const {
    model,
    messages,
    tools,
    toolChoice,
    enableThinking,
    maxTokens,
    temperatureOverride,
  } = params
  return {
    model,
    messages,
    max_tokens: maxTokens,
    ...(tools.length > 0 && {
      tools,
      ...(toolChoice && { tool_choice: toolChoice }),
    }),
    stream: true,
    stream_options: { include_usage: true },
    // Enable chain-of-thought output for DeepSeek and MiMo models.
    // When active, temperature/top_p/presence_penalty/frequency_penalty are ignored.
    ...(enableThinking && {
      // Official DeepSeek API format
      thinking: { type: 'enabled' },
      // Self-hosted DeepSeek-V3.2 format
      enable_thinking: true,
      // Both DeepSeek self-hosted and MiMo formats in chat_template_kwargs
      chat_template_kwargs: { thinking: true, enable_thinking: true },
    }),
    // Only send temperature when thinking mode is off (DeepSeek ignores it anyway,
    // but other providers may respect it)
    ...(!enableThinking &&
      temperatureOverride !== undefined && {
        temperature: temperatureOverride,
      }),
  }
}
