import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { getAPIContextManagement } from '../apiMicrocompact.js'

const ENV_KEYS = ['API_MAX_INPUT_TOKENS', 'API_TARGET_INPUT_TOKENS'] as const
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}

function firstClearToolUsesEdit(contextWindowTokens?: number) {
  const config = getAPIContextManagement({ contextWindowTokens })
  const edit = config?.edits.find(
    edit => edit.type === 'clear_tool_uses_20250919',
  )
  if (!edit || edit.type !== 'clear_tool_uses_20250919') {
    throw new Error('Expected clear_tool_uses_20250919 edit')
  }
  return edit
}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = savedEnv[key]
    }
  }
})

describe('getAPIContextManagement', () => {
  test('keeps the default 200K-window clear-tool thresholds unchanged', () => {
    const edit = firstClearToolUsesEdit(200_000)

    expect(edit.trigger?.value).toBe(180_000)
    expect(edit.clear_at_least?.value).toBe(140_000)
  })

  test('scales clear-tool thresholds for a 1M context window', () => {
    const edit = firstClearToolUsesEdit(1_000_000)

    expect(edit.trigger?.value).toBe(900_000)
    expect(edit.clear_at_least?.value).toBe(700_000)
  })

  test('keeps API_MAX_INPUT_TOKENS and API_TARGET_INPUT_TOKENS overrides authoritative', () => {
    process.env.API_MAX_INPUT_TOKENS = '750000'
    process.env.API_TARGET_INPUT_TOKENS = '150000'

    const edit = firstClearToolUsesEdit(1_000_000)

    expect(edit.trigger?.value).toBe(750_000)
    expect(edit.clear_at_least?.value).toBe(600_000)
  })
})
