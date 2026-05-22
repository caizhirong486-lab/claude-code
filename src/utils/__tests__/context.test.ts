import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  getContextWindowForModel,
  MODEL_CONTEXT_WINDOW_DEFAULT,
} from '../context.js'

const ENV_KEYS = [
  'CLAUDE_CODE_DISABLE_1M_CONTEXT',
  'CLAUDE_CODE_MAX_CONTEXT_TOKENS',
  'USER_TYPE',
] as const

const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}

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

describe('getContextWindowForModel', () => {
  test('treats deepseek-v4-pro as a 1M context model', () => {
    expect(getContextWindowForModel('deepseek-v4-pro')).toBe(1_000_000)
  })

  test('respects CLAUDE_CODE_DISABLE_1M_CONTEXT for deepseek-v4-pro', () => {
    process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT = '1'

    expect(getContextWindowForModel('deepseek-v4-pro')).toBe(
      MODEL_CONTEXT_WINDOW_DEFAULT,
    )
  })
})
